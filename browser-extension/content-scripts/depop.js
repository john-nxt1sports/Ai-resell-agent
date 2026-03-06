/**
 * AI Resell Agent - Depop Content Script
 * Handles login detection for Depop (depop.com)
 * 
 * @version 1.0.0
 */

"use strict";

const MARKETPLACE = "depop";
const Logger = {
  _prefix: "[AI Agent - Depop]",
  info: (msg, data) => data ? console.log(`${Logger._prefix} ${msg}`, data) : console.log(`${Logger._prefix} ${msg}`),
  error: (msg, err) => err ? console.error(`${Logger._prefix} ERROR: ${msg}`, err) : console.error(`${Logger._prefix} ERROR: ${msg}`),
};

Logger.info("Content script loaded on Depop");

/**
 * Check if user is logged into Depop
 */
function checkLoginStatus() {
  try {
    // Check for profile/account elements
    const loggedInIndicators = [
      '[data-testid="navigation__profile"]',
      '[data-testid="profile-menu"]',
      'a[href*="/selling"]',
      'a[href*="/likes"]',
      'a[href*="/messages"]',
      '[class*="ProfileIcon"]',
      '[class*="avatar"]',
    ];

    for (const selector of loggedInIndicators) {
      if (document.querySelector(selector)) {
        Logger.info(`Found logged-in indicator: ${selector}`);
        return true;
      }
    }

    // Check for login buttons (indicates NOT logged in)
    const loginBtn = document.querySelector('a[href*="/login"], button[data-testid="login"]');
    if (loginBtn && loginBtn.offsetParent !== null) {
      Logger.info("Found login button - user NOT logged in");
      return false;
    }

    // Check localStorage for auth (wrapped in try/catch — some sites block access)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('token') || key.includes('auth') || key.includes('user'))) {
          Logger.info(`Found auth key: ${key}`);
          return true;
        }
      }
    } catch {
      // localStorage may throw SecurityError on some pages
    }

    Logger.info("Could not determine login status");
    return false;
  } catch (error) {
    Logger.error("Error checking login status", error);
    return false;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Logger.info("Received message", { type: message.type });

  switch (message.type) {
    case "CHECK_LOGIN_STATUS":
      const isLoggedIn = checkLoginStatus();
      sendResponse({ isLoggedIn, marketplace: MARKETPLACE });
      break;

    case "PING":
      sendResponse({ success: true, marketplace: MARKETPLACE });
      break;

    default:
      return false;
  }

  return true;
});

// Report initial status
setTimeout(() => {
  const isLoggedIn = checkLoginStatus();
  chrome.runtime.sendMessage({
    type: "UPDATE_LOGIN_STATUS",
    marketplace: MARKETPLACE,
    isLoggedIn,
  }).catch(err => Logger.error("Failed to send initial status", err));
}, 1000);

Logger.info("Depop content script initialized");
