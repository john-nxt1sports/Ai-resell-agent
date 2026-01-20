/**
 * Session Capture System
 * Captures logged-in sessions from user's browser like Vendoo/Flyp
 * 
 * Flow:
 * 1. User clicks "Connect Marketplace"
 * 2. Opens popup/new window to marketplace
 * 3. User logs in manually (Google, Facebook, email, whatever)
 * 4. We capture the session cookies
 * 5. Store cookies for automation
 */

import { Browser, BrowserContext, Page } from "playwright";
import { createStealthBrowser, createStealthContext, saveCookies } from "./browser-utils";

export interface SessionCaptureResult {
  success: boolean;
  cookies?: string;
  error?: string;
  marketplace: string;
  userId: string;
}

/**
 * Open marketplace in interactive browser for user to log in
 * Captures cookies after successful login
 */
export async function captureMarketplaceSession(
  marketplace: string,
  userId: string
): Promise<SessionCaptureResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log(`[SessionCapture] Starting session capture for ${marketplace}`);

    // Create visible browser for user interaction
    browser = await createStealthBrowser({ 
      headless: false // User can see and interact
    });

    context = await createStealthContext(browser);
    page = await context.newPage();

    // Navigate to marketplace
    const urls: Record<string, string> = {
      mercari: "https://www.mercari.com/",
      poshmark: "https://poshmark.com/",
      ebay: "https://www.ebay.com/",
      depop: "https://www.depop.com/",
    };

    const url = urls[marketplace.toLowerCase()];
    if (!url) {
      throw new Error(`Unsupported marketplace: ${marketplace}`);
    }

    await page.goto(url);

    console.log(`[SessionCapture] Opened ${marketplace} - waiting for user to log in...`);

    // Ensure page is not null
    if (!page) {
      throw new Error("Failed to create browser page");
    }

    // Wait for user to log in (detect when they're on a logged-in page)
    // This is marketplace-specific
    const loginDetectors: Record<string, () => Promise<boolean>> = {
      mercari: async () => {
        if (!page) return false;
        try {
          // Check for logged-in indicators (profile menu, sell button, etc.)
          await page.waitForSelector('[data-testid="UserMenu"], [href="/sell"], .nav-profile', {
            timeout: 180000, // 3 minutes
          });
          
          // Also check URL is not on login page
          const currentUrl = page.url();
          return !currentUrl.includes('/login') && !currentUrl.includes('/signup');
        } catch {
          return false;
        }
      },
      
      poshmark: async () => {
        if (!page) return false;
        try {
          // Check for Poshmark logged-in indicators
          await page.waitForSelector('.dropdown__user, [data-test="header-account-menu"], .user-image', {
            timeout: 180000,
          });
          return true;
        } catch {
          return false;
        }
      },
      
      ebay: async () => {
        if (!page) return false;
        try {
          await page.waitForSelector('#gh-ug, #gh-eb-u, [id*="user-info"]', {
            timeout: 180000,
          });
          return true;
        } catch {
          return false;
        }
      },
      
      depop: async () => {
        if (!page) return false;
        try {
          await page.waitForSelector('[data-testid="avatar"], .ProfileHeader__avatar', {
            timeout: 180000,
          });
          return true;
        } catch {
          return false;
        }
      },
    };

    const detector = loginDetectors[marketplace.toLowerCase()];
    if (!detector) {
      throw new Error(`No login detector for ${marketplace}`);
    }

    // Wait for login detection
    const isLoggedIn = await detector();
    
    if (!isLoggedIn) {
      throw new Error("Login detection timed out or failed");
    }

    console.log(`[SessionCapture] Login detected! Capturing cookies...`);

    // Capture cookies
    const cookies = await saveCookies(context);

    // Verify cookies are valid
    if (!cookies || cookies.length < 50) {
      throw new Error("Failed to capture valid session cookies");
    }

    console.log(`[SessionCapture] Successfully captured session for ${marketplace}`);
    console.log(`[SessionCapture] Cookie length: ${cookies.length} characters`);

    // Close browser
    await browser.close();

    return {
      success: true,
      cookies,
      marketplace,
      userId,
    };

  } catch (error: any) {
    console.error(`[SessionCapture] Failed:`, error);

    // Clean up
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    return {
      success: false,
      error: error.message,
      marketplace,
      userId,
    };
  }
}

/**
 * Verify captured session is still valid
 */
export async function verifySession(
  marketplace: string,
  cookies: string
): Promise<boolean> {
  let browser: Browser | null = null;

  try {
    browser = await createStealthBrowser({ headless: true });
    const context = await createStealthContext(browser);
    
    // Load cookies
    const parsedCookies = JSON.parse(cookies);
    await context.addCookies(parsedCookies);

    const page = await context.newPage();

    // Navigate to marketplace
    const urls: Record<string, string> = {
      mercari: "https://www.mercari.com/",
      poshmark: "https://poshmark.com/",
      ebay: "https://www.ebay.com/",
      depop: "https://www.depop.com/",
    };

    await page.goto(urls[marketplace.toLowerCase()]);
    await page.waitForLoadState("domcontentloaded");

    // Check if still logged in (marketplace-specific)
    let isValid = false;

    switch (marketplace.toLowerCase()) {
      case "mercari":
        isValid = !!(await page.$('[data-testid="UserMenu"], [href="/sell"]'));
        break;
      case "poshmark":
        isValid = !!(await page.$('.dropdown__user, [data-test="header-account-menu"]'));
        break;
      case "ebay":
        isValid = !!(await page.$('#gh-ug, #gh-eb-u'));
        break;
      case "depop":
        isValid = !!(await page.$('[data-testid="avatar"]'));
        break;
    }

    await browser.close();
    return isValid;

  } catch (error) {
    console.error("[SessionCapture] Verification failed:", error);
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    return false;
  }
}
