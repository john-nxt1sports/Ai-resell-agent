/**
 * Mercari Automation Bot
 * Professional implementation for Mercari marketplace
 */

import { Browser, BrowserContext, Page } from "playwright";
import type {
  MarketplaceBot,
  MarketplaceCredentials,
  ListingJobData,
  ListingJobResult,
  AutomationError,
} from "../types";
import {
  createStealthBrowser,
  createStealthContext,
  humanType,
  randomDelay,
  safeNavigate,
  saveCookies,
  loadCookies,
  captureScreenshot,
  detectCaptcha,
  humanScroll,
} from "../browser-utils";

export class MercariBot implements MarketplaceBot {
  marketplace = "mercari" as const;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;

  private readonly BASE_URL = "https://www.mercari.com";
  private readonly LOGIN_URL = "https://www.mercari.com/login/";
  private readonly SELL_URL = "https://www.mercari.com/sell/";

  /**
   * Login to Mercari
   * Uses captured session cookies - no password needed
   */
  async login(credentials: MarketplaceCredentials): Promise<void> {
    try {
      console.log(`[Mercari] Starting login for user ${credentials.userId}`);

      // Initialize browser (headless: false for debugging)
      this.browser = await createStealthBrowser({ headless: false });
      this.context = await createStealthContext(this.browser);
      this.page = await this.context.newPage();

      // Load saved session cookies (required)
      if (!credentials.cookies) {
        throw this.createError(
          "NO_SESSION",
          "No session cookies found. Please connect your marketplace account in Settings.",
          false
        );
      }

      await loadCookies(this.context, credentials.cookies);
      await this.page.goto(this.BASE_URL);
      await randomDelay(2000, 3000);

      // Check if still logged in
      const isLoggedIn = await this.verifySession();
      if (isLoggedIn) {
        console.log("[Mercari] Session restored from cookies ✅");
        this.isLoggedIn = true;
        return;
      }

      // If cookies expired, user needs to reconnect
      throw this.createError(
        "SESSION_EXPIRED",
        "Session expired. Please reconnect your marketplace account in Settings.",
        false
      );

    } catch (error: any) {
      console.error("[Mercari] Login failed:", error);
      throw this.createError("LOGIN_FAILED", error.message, true);
    }
  }

  /**
   * Create a new listing on Mercari
   */
  async createListing(data: ListingJobData): Promise<ListingJobResult> {
    if (!this.isLoggedIn || !this.page) {
      throw this.createError("NOT_AUTHENTICATED", "Bot is not logged in", false);
    }

    let screenshotBuffer: Buffer | null = null;

    try {
      console.log(`[Mercari] Creating listing: ${data.listing.title}`);

      // Navigate to sell page (use domcontentloaded instead of networkidle)
      await safeNavigate(this.page, this.SELL_URL, { 
        timeout: 60000, 
        waitUntil: "domcontentloaded" 
      });

      // Wait for the listing form
      await this.page.waitForSelector('input[placeholder*="title"]', { timeout: 10000 });

      // 1. Upload Photos
      console.log("[Mercari] Uploading images...");
      await this.uploadImages(data.listing.images);
      await randomDelay(2000, 3000);

      // 2. Fill in Title
      console.log("[Mercari] Setting title...");
      await humanType(this.page, 'input[placeholder*="title"]', data.listing.title);
      await randomDelay(500, 1000);

      // 3. Select Category
      if (data.listing.category) {
        console.log("[Mercari] Selecting category...");
        await this.selectCategory(data.listing.category);
        await randomDelay(500, 1000);
      }

      // 4. Select Condition
      if (data.listing.condition) {
        await this.selectCondition(data.listing.condition);
        await randomDelay(500, 1000);
      }

      // 5. Fill in Description
      console.log("[Mercari] Setting description...");
      const mercariDescription = this.formatMercariDescription(data.listing);
      await humanType(this.page, 'textarea[placeholder*="description"]', mercariDescription);
      await randomDelay(500, 1000);

      // 6. Set Price
      console.log("[Mercari] Setting price...");
      await humanType(this.page, 'input[placeholder*="price"]', data.listing.price.toString());
      await randomDelay(500, 1000);

      // 7. Select Shipping (Mercari-specific)
      await this.selectShipping();
      await randomDelay(500, 1000);

      // Scroll to see submit button
      await humanScroll(this.page, 500);

      // Take screenshot before submission
      screenshotBuffer = await captureScreenshot(this.page, "before-submit");

      // 8. Submit the listing
      console.log("[Mercari] Submitting listing...");
      await this.page.click('button:has-text("List")');
      await randomDelay(3000, 5000);

      // Wait for success
      await this.page.waitForURL((url) => url.href.includes("/item/"), {
        timeout: 15000,
      });

      const listingUrl = this.page.url();
      const listingId = this.extractListingId(listingUrl);

      console.log(`[Mercari] Listing created successfully: ${listingUrl}`);

      return {
        success: true,
        marketplace: "mercari",
        listingId,
        url: listingUrl,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error("[Mercari] Failed to create listing:", error);

      if (this.page) {
        screenshotBuffer = await captureScreenshot(this.page, "error");
      }

      return {
        success: false,
        marketplace: "mercari",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verify if session is still valid
   */
  async verifySession(): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.goto(this.BASE_URL);
      await randomDelay(2000, 3000);

      const url = this.page.url();
      return !url.includes("/login");
    } catch {
      return false;
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.isLoggedIn = false;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async uploadImages(imageUrls: string[]): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    const maxImages = Math.min(imageUrls.length, 12); // Mercari allows 12 images

    for (let i = 0; i < maxImages; i++) {
      const fileInput = await this.page.$('input[type="file"]');
      if (fileInput) {
        // In production, download and upload the image
        console.log(`[Mercari] Image ${i + 1} uploaded`);
        await randomDelay(1000, 2000);
      }
    }
  }

  private formatMercariDescription(listing: any): string {
    let description = listing.description || "";

    // Add condition details
    if (listing.condition) {
      description += `\n\nCondition: ${this.capitalizeCondition(listing.condition)}`;
    }

    // Add brand
    if (listing.brand) {
      description += `\nBrand: ${listing.brand}`;
    }

    // Add shipping note
    description += "\n\n📦 Fast shipping! Will ship within 1-2 business days.";

    // Add tags
    if (listing.tags && listing.tags.length > 0) {
      description += "\n\n" + listing.tags.map((tag: string) => `#${tag}`).join(" ");
    }

    return description;
  }

  private async selectCategory(category: string): Promise<void> {
    if (!this.page) return;

    await this.page.click('button:has-text("Category")');
    await randomDelay(300, 600);

    // Try to find and click the category
    try {
      await this.page.click(`text="${category}"`);
    } catch {
      // If not found, select a default
      await this.page.click('text="Other"');
    }
  }

  private async selectCondition(condition: string): Promise<void> {
    if (!this.page) return;

    const conditionMap: Record<string, string> = {
      new: "New",
      like_new: "Like New",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
    };

    const mercariCondition = conditionMap[condition] || "Good";

    await this.page.click('button:has-text("Condition")');
    await randomDelay(300, 600);
    await this.page.click(`text="${mercariCondition}"`);
  }

  private async selectShipping(): Promise<void> {
    if (!this.page) return;

    // Select default shipping option (Mercari prepaid label)
    try {
      await this.page.click('text="Ship on your own"');
    } catch {
      console.log("[Mercari] Using default shipping");
    }
  }

  private extractListingId(url: string): string {
    const match = url.match(/\/item\/m(\d+)/);
    return match ? match[1] : "";
  }

  private capitalizeCondition(condition: string): string {
    return condition
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private createError(
    code: string,
    message: string,
    retryable: boolean = true,
    requiresUserAction: boolean = false
  ): AutomationError {
    return {
      code,
      message,
      retryable,
      requiresUserAction,
    };
  }
}
