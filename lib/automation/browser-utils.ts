/**
 * Browser automation utilities with anti-detection measures
 * Similar to how Vendoo handles bot detection
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import type { BrowserConfig } from "./types";

/**
 * Creates a browser instance with anti-detection measures
 */
export async function createStealthBrowser(
  config: BrowserConfig = { headless: true }
): Promise<Browser> {
  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      ...(config.proxy ? [`--proxy-server=${config.proxy.server}`] : []),
    ],
  });

  return browser;
}

/**
 * Creates a browser context with realistic fingerprints
 */
export async function createStealthContext(
  browser: Browser,
  config: BrowserConfig = { headless: true }
): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      config.userAgent ||
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: config.viewport || { width: 1920, height: 1080 },
    locale: config.locale || "en-US",
    timezoneId: config.timezone || "America/New_York",
    permissions: ["geolocation"],
    geolocation: { latitude: 40.7128, longitude: -74.006 }, // New York
    colorScheme: "light",
    ...(config.proxy?.username && {
      httpCredentials: {
        username: config.proxy.username,
        password: config.proxy.password || "",
      },
    }),
  });

  // Add extra stealth scripts
  await context.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Mock plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    // Mock languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  return context;
}

/**
 * Human-like delays to avoid detection
 */
export function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Types text like a human with random delays
 */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(100, 300);

  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 });
  }

  await randomDelay(200, 500);
}

/**
 * Scrolls page naturally like a human
 */
export async function humanScroll(page: Page, distance: number = 500): Promise<void> {
  await page.evaluate(
    (dist) => {
      window.scrollBy({
        top: dist,
        left: 0,
        behavior: "smooth",
      });
    },
    distance
  );
  await randomDelay(500, 1000);
}

/**
 * Moves mouse to element naturally
 */
export async function moveMouseNaturally(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (element) {
    const box = await element.boundingBox();
    if (box) {
      // Move mouse in steps to simulate human movement
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
          steps: 1,
        });
        await randomDelay(10, 30);
      }
    }
  }
}

/**
 * Waits for navigation with timeout and retry
 */
export async function safeNavigate(
  page: Page,
  url: string,
  options: { timeout?: number; waitUntil?: "load" | "domcontentloaded" | "networkidle" } = {}
): Promise<void> {
  const { timeout = 30000, waitUntil = "networkidle" } = options;

  try {
    await page.goto(url, { timeout, waitUntil });
    await randomDelay(1000, 2000);
  } catch (error) {
    console.error(`Failed to navigate to ${url}:`, error);
    throw error;
  }
}

/**
 * Saves cookies for session persistence
 */
export async function saveCookies(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  return JSON.stringify(cookies);
}

/**
 * Loads saved cookies
 */
export async function loadCookies(context: BrowserContext, cookiesString: string): Promise<void> {
  try {
    const cookies = JSON.parse(cookiesString);
    await context.addCookies(cookies);
  } catch (error) {
    console.error("Failed to load cookies:", error);
  }
}

/**
 * Takes screenshot for debugging
 */
export async function captureScreenshot(
  page: Page,
  name: string = "screenshot"
): Promise<Buffer> {
  return await page.screenshot({
    fullPage: true,
    type: "png",
  });
}

/**
 * Handles CAPTCHA detection
 */
export async function detectCaptcha(page: Page): Promise<boolean> {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    '[class*="captcha"]',
    "#captcha",
  ];

  for (const selector of captchaSelectors) {
    const element = await page.$(selector);
    if (element) {
      return true;
    }
  }

  return false;
}
