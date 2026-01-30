/**
 * Session Capture Module (2026 Best Practices)
 * Captures cookies, localStorage, and sessionStorage for marketplace authentication
 * Follows Vendoo-style hybrid architecture
 */

const SessionCapture = {
  /**
   * Capture all session data for a marketplace
   * @param {string} marketplace - poshmark, ebay, mercari
   * @returns {Promise<Object>} Session data
   */
  async captureSessionData(marketplace) {
    try {
      const marketplaceDomains = {
        poshmark: ["poshmark.com", ".poshmark.com"],
        ebay: ["ebay.com", ".ebay.com"],
        mercari: ["mercari.com", ".mercari.com"],
      };

      const domains = marketplaceDomains[marketplace] || [];
      
      // Capture cookies for all domains
      const cookies = [];
      for (const domain of domains) {
        const domainCookies = await chrome.cookies.getAll({
          domain: domain,
        });
        cookies.push(...domainCookies);
      }

      // Capture localStorage and sessionStorage
      const storageData = await this.captureStorageData(marketplace);

      // Detect login state
      const isLoggedIn = await this.checkLoginState(marketplace, cookies, storageData);

      return {
        marketplace,
        cookies: cookies,
        localStorage: storageData.localStorage,
        sessionStorage: storageData.sessionStorage,
        isLoggedIn,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
    } catch (error) {
      console.error(`[SessionCapture] Error capturing ${marketplace}:`, error);
      throw error;
    }
  },

  /**
   * Capture storage data from a marketplace tab
   */
  async captureStorageData(marketplace) {
    const marketplaceUrls = {
      poshmark: "https://poshmark.com",
      ebay: "https://www.ebay.com",
      mercari: "https://www.mercari.com",
    };

    const url = marketplaceUrls[marketplace];
    if (!url) {
      return { localStorage: {}, sessionStorage: {} };
    }

    try {
      // Find existing tab or create new one
      const tabs = await chrome.tabs.query({ url: `${url}/*` });
      const tab = tabs.length > 0 ? tabs[0] : await chrome.tabs.create({ url, active: false });

      // Execute script to get storage
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const local = {};
            const session = {};

            // Capture localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              local[key] = localStorage.getItem(key);
            }

            // Capture sessionStorage
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              session[key] = sessionStorage.getItem(key);
            }

            return { localStorage: local, sessionStorage: session };
          } catch (e) {
            return { localStorage: {}, sessionStorage: {}, error: e.message };
          }
        },
      });

      return result[0]?.result || { localStorage: {}, sessionStorage: {} };
    } catch (error) {
      console.error(`[SessionCapture] Storage capture error:`, error);
      return { localStorage: {}, sessionStorage: {} };
    }
  },

  /**
   * Check if user is logged in based on cookies and storage
   */
  async checkLoginState(marketplace, cookies, storageData) {
    // Check for auth-related cookies
    const authCookiePatterns = {
      poshmark: ["_poshmark_session", "user_id", "auth_token"],
      ebay: ["s", "nonsession", "dp1"],
      mercari: ["_mercari_session", "oauth_token"],
    };

    const patterns = authCookiePatterns[marketplace] || [];
    const hasCookies = patterns.some((pattern) =>
      cookies.some((cookie) => cookie.name.includes(pattern))
    );

    // Check for auth tokens in localStorage
    const hasLocalAuth = storageData.localStorage &&
      (Object.keys(storageData.localStorage).some(key => 
        key.includes("token") || key.includes("auth") || key.includes("user")
      ));

    return hasCookies || hasLocalAuth;
  },

  /**
   * Encrypt session data before sending to backend
   * Uses SubtleCrypto for client-side encryption
   */
  async encryptSessionData(sessionData, encryptionKey) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(sessionData));

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Import the encryption key
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(encryptionKey),
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("[SessionCapture] Encryption error:", error);
      throw error;
    }
  },

  /**
   * Sync session data to backend
   */
  async syncToBackend(sessionData, apiUrl, authToken) {
    try {
      const response = await fetch(`${apiUrl}/api/sessions/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[SessionCapture] Synced ${sessionData.marketplace} successfully`);
      return result;
    } catch (error) {
      console.error(`[SessionCapture] Sync error:`, error);
      throw error;
    }
  },

  /**
   * Auto-refresh session capture (every 30 minutes)
   */
  startAutoRefresh(marketplace, apiUrl, authToken, intervalMinutes = 30) {
    const intervalMs = intervalMinutes * 60 * 1000;

    const refreshInterval = setInterval(async () => {
      try {
        const sessionData = await this.captureSessionData(marketplace);
        
        // Only sync if logged in
        if (sessionData.isLoggedIn) {
          await this.syncToBackend(sessionData, apiUrl, authToken);
        }
      } catch (error) {
        console.error(`[SessionCapture] Auto-refresh failed:`, error);
      }
    }, intervalMs);

    // Store interval ID for cleanup
    return refreshInterval;
  },

  /**
   * Monitor login state changes
   */
  async monitorLoginStateChanges(marketplace, onChange) {
    let lastLoginState = null;

    const checkInterval = setInterval(async () => {
      try {
        const sessionData = await this.captureSessionData(marketplace);
        
        if (sessionData.isLoggedIn !== lastLoginState) {
          lastLoginState = sessionData.isLoggedIn;
          
          if (onChange && typeof onChange === "function") {
            onChange(marketplace, sessionData.isLoggedIn, sessionData);
          }
        }
      } catch (error) {
        console.error(`[SessionCapture] Monitor error:`, error);
      }
    }, 60000); // Check every minute

    return checkInterval;
  },
};

// Export for use in background.js and other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = SessionCapture;
}
