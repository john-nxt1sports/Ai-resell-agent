/**
 * AI Resell Agent - Flyp Content Script
 * Handles login detection for Flyp (tools.joinflyp.com)
 * 
 * Note: Flyp automation is handled by the Python worker via browser-use,
 * this script primarily handles session detection and sync.
 * 
 * @version 1.0.0
 */

"use strict";

const MARKETPLACE = "flyp";
const Logger = {
  _prefix: "[AI Agent - Flyp]",
  info: (msg, data) => data ? console.log(`${Logger._prefix} ${msg}`, data) : console.log(`${Logger._prefix} ${msg}`),
  error: (msg, err) => err ? console.error(`${Logger._prefix} ERROR: ${msg}`, err) : console.error(`${Logger._prefix} ERROR: ${msg}`),
};

// Initialize on page load
Logger.info("Content script loaded on Flyp");

/**
 * Check if user is logged into Flyp
 * Looks for common indicators of logged-in state
 */
function checkLoginStatus() {
  try {
    // Check URL - if on tools.joinflyp.com pages like /poshmark, /crosslist, etc, user is logged in
    const url = window.location.href;
    const loggedInPaths = ['/my-items', '/poshmark', '/crosslist', '/orders', '/offers', '/analytics', '/mercari', '/ebay'];
    if (loggedInPaths.some(path => url.includes(path))) {
      Logger.info("On authenticated Flyp page - user is logged in");
      return true;
    }

    // Check for user handle display (like @mariakeller01)
    const userHandleEl = document.querySelector('a[href*="@"], [class*="username"], [class*="user-handle"]');
    if (userHandleEl && userHandleEl.textContent.includes('@')) {
      Logger.info(`Found user handle: ${userHandleEl.textContent}`);
      return true;
    }

    // Check for Flyp navigation tabs that only appear when logged in
    const flypNavSelectors = [
      'a[href*="/crosslist"]',
      'a[href*="/orders"]', 
      'a[href*="/offers"]',
      'a[href*="/analytics"]',
      '[class*="Crosslister"]',
      '[class*="Sharer"]',
    ];

    for (const selector of flypNavSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        Logger.info(`Found Flyp nav element: ${selector}`);
        return true;
      }
    }

    // Check for Flyp logo + navigation combo (logged-in header)
    const flypLogo = document.querySelector('img[alt*="Flyp"], [class*="flyp-logo"], svg[class*="logo"]');
    const hasNav = document.querySelector('nav, [class*="sidebar"], [class*="nav"]');
    if (flypLogo && hasNav) {
      Logger.info("Found Flyp header with navigation - likely logged in");
      return true;
    }

    // Check page content for logged-in indicators
    const pageText = document.body?.innerText || '';
    const loggedInKeywords = ['My Closet', 'Shares Today', 'Pending Jobs', 'Daily shares limit', 'Sharing mode'];
    if (loggedInKeywords.some(keyword => pageText.includes(keyword))) {
      Logger.info("Found logged-in page content");
      return true;
    }

    // Check for profile/account elements that only appear when logged in
    const loggedInIndicators = [
      // User avatar or profile menu
      '[data-testid="user-menu"]',
      '[class*="avatar"]',
      '[class*="profile"]',
      '[class*="account"]',
      // Logged-in navigation items
      'a[href*="/closet"]',
      'a[href*="/settings"]',
      // Flyp-specific elements when logged in
      '[class*="UserMenu"]',
      '[class*="sidebar"]',
      '.nav-user',
    ];

    // Check if any logged-in indicator exists
    for (const selector of loggedInIndicators) {
      if (document.querySelector(selector)) {
        Logger.info(`Found logged-in indicator: ${selector}`);
        return true;
      }
    }

    // Check for logout button (indicates logged in)
    const logoutBtn = document.querySelector('button[class*="logout"], a[href*="logout"], [data-action="logout"]');
    if (logoutBtn) {
      Logger.info("Found logout button - user is logged in");
      return true;
    }

    // Check localStorage for auth tokens (wrapped in try/catch — some sites block access)
    try {
      const authKeys = ['token', 'auth', 'session', 'user', 'flyp'];
      for (const key of authKeys) {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.toLowerCase().includes(key)) {
            Logger.info(`Found auth-related localStorage key: ${storageKey}`);
            return true;
          }
        }
      }
    } catch {
      // localStorage may throw SecurityError on some pages
    }

    // Check for login/signup buttons (indicates NOT logged in)
    const loginIndicators = [
      'a[href*="login"]',
      'a[href*="signin"]',
      'button[class*="login"]',
      '[data-action="login"]',
    ];

    for (const selector of loginIndicators) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) { // visible
        Logger.info(`Found login button: ${selector} - user NOT logged in`);
        return false;
      }
    }

    Logger.info("Could not determine login status - assuming logged in if on tools.joinflyp.com");
    // If we're on tools.joinflyp.com at all, assume logged in (it redirects if not)
    return url.includes('tools.joinflyp.com');
  } catch (error) {
    Logger.error("Error checking login status", error);
    return false;
  }
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Logger.info("Received message", { type: message.type });

  switch (message.type) {
    case "CHECK_LOGIN_STATUS":
      const isLoggedIn = checkLoginStatus();
      Logger.info(`Login status check: ${isLoggedIn ? "LOGGED IN" : "NOT LOGGED IN"}`);
      sendResponse({ isLoggedIn, marketplace: MARKETPLACE });
      break;

    case "PING":
      sendResponse({ success: true, marketplace: MARKETPLACE });
      break;

    default:
      Logger.debug(`Ignoring unrelated message type: ${message.type}`);
      return false;
  }

  return true; // Keep channel open for async
});

// Report initial status to background script
setTimeout(() => {
  const isLoggedIn = checkLoginStatus();
  chrome.runtime.sendMessage({
    type: "UPDATE_LOGIN_STATUS",
    marketplace: MARKETPLACE,
    isLoggedIn,
  }).catch(err => Logger.error("Failed to send initial status", err));
}, 1000);

Logger.info("Flyp content script initialized");
