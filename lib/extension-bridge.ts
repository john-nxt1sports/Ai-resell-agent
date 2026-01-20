/**
 * Extension Bridge - Communicates between the web app and Chrome extension
 * Handles checking extension status, marketplace connections, and queuing listings
 */

// Declare chrome type for TypeScript
declare const chrome: any;

// Get extension ID from environment or use default
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || "";

export interface ExtensionStatus {
  installed: boolean;
  connected: boolean;
  extensionId?: string;
}

export interface MarketplaceStatus {
  isLoggedIn: boolean;
  lastChecked?: number;
  error?: string;
  needsVerification?: boolean;
}

export interface ExtensionMarketplaces {
  poshmark?: MarketplaceStatus;
  mercari?: MarketplaceStatus;
  ebay?: MarketplaceStatus;
  depop?: MarketplaceStatus;
}

export interface ListingJob {
  id: string;
  listing: {
    title: string;
    description: string;
    price: number;
    images: string[];
    category?: string;
    condition?: string;
    brand?: string;
    size?: string;
  };
  marketplace: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

/**
 * Check if the extension is installed and responding
 */
export async function checkExtensionStatus(): Promise<ExtensionStatus> {
  return new Promise((resolve) => {
    // Try to detect extension via custom event
    const timeoutId = setTimeout(() => {
      resolve({ installed: false, connected: false });
    }, 2000);

    // Listen for extension response
    const handleResponse = (event: MessageEvent) => {
      if (
        event.data?.type === "AI_RESELL_AGENT_PONG" ||
        event.data?.type === "AI_RESELL_AGENT_READY"
      ) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleResponse);
        resolve({
          installed: true,
          connected: true,
          extensionId: event.data.extensionId,
        });
      }
    };

    window.addEventListener("message", handleResponse);

    // Try Chrome runtime sendMessage if extension ID is known
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.sendMessage &&
      EXTENSION_ID
    ) {
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "PING" },
          (response: any) => {
            if (response?.success) {
              clearTimeout(timeoutId);
              window.removeEventListener("message", handleResponse);
              resolve({
                installed: true,
                connected: true,
                extensionId: response.extensionId || EXTENSION_ID,
              });
            }
          },
        );
      } catch {
        // Extension not available via runtime
      }
    }

    // Post message for content script to catch
    window.postMessage({ type: "AI_RESELL_AGENT_PING" }, "*");
  });
}

/**
 * Get marketplace connection statuses from extension
 */
export async function getMarketplaceStatuses(): Promise<ExtensionMarketplaces> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Extension not responding"));
    }, 5000);

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.sendMessage &&
      EXTENSION_ID
    ) {
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "CHECK_CONNECTION" },
          (response: any) => {
            clearTimeout(timeoutId);
            if (response?.success) {
              resolve(response.marketplaces || {});
            } else {
              reject(
                new Error(
                  response?.error || "Failed to get marketplace statuses",
                ),
              );
            }
          },
        );
      } catch {
        clearTimeout(timeoutId);
        reject(new Error("Chrome runtime error"));
      }
    } else {
      // Fallback to window message
      const handleResponse = (event: MessageEvent) => {
        if (event.data?.type === "AI_RESELL_AGENT_MARKETPLACES") {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleResponse);
          resolve(event.data.marketplaces || {});
        }
      };

      window.addEventListener("message", handleResponse);
      window.postMessage({ type: "AI_RESELL_AGENT_GET_MARKETPLACES" }, "*");
    }
  });
}

/**
 * Queue listings for posting via extension
 */
export async function queueListingsForExtension(
  listings: Array<{
    title: string;
    description: string;
    price: number;
    images: string[];
    category?: string;
    condition?: string;
    brand?: string;
  }>,
  marketplaces: string[],
): Promise<{
  success: boolean;
  jobsCreated?: number;
  jobs?: ListingJob[];
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Extension not responding"));
    }, 10000);

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.sendMessage &&
      EXTENSION_ID
    ) {
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            type: "QUEUE_LISTINGS",
            listings,
            marketplaces,
          },
          (response: any) => {
            clearTimeout(timeoutId);
            resolve(response);
          },
        );
      } catch {
        clearTimeout(timeoutId);
        reject(new Error("Chrome runtime error"));
      }
    } else {
      // Fallback to window message
      const handleResponse = (event: MessageEvent) => {
        if (event.data?.type === "AI_RESELL_AGENT_QUEUE_RESULT") {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleResponse);
          resolve(event.data);
        }
      };

      window.addEventListener("message", handleResponse);
      window.postMessage(
        {
          type: "AI_RESELL_AGENT_QUEUE_LISTINGS",
          listings,
          marketplaces,
        },
        "*",
      );
    }
  });
}

/**
 * Get pending jobs from extension
 */
export async function getPendingJobs(): Promise<ListingJob[]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Extension not responding"));
    }, 5000);

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.sendMessage &&
      EXTENSION_ID
    ) {
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "GET_PENDING_JOBS" },
          (response: any) => {
            clearTimeout(timeoutId);
            if (response?.success) {
              resolve(response.jobs || []);
            } else {
              reject(
                new Error(response?.error || "Failed to get pending jobs"),
              );
            }
          },
        );
      } catch {
        clearTimeout(timeoutId);
        reject(new Error("Chrome runtime error"));
      }
    } else {
      clearTimeout(timeoutId);
      resolve([]);
    }
  });
}

/**
 * Start processing the next pending job
 */
export async function processNextJob(): Promise<{
  success: boolean;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Extension not responding"));
    }, 60000); // Longer timeout for processing

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.sendMessage &&
      EXTENSION_ID
    ) {
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: "PROCESS_NEXT_JOB" },
          (response: any) => {
            clearTimeout(timeoutId);
            resolve(response);
          },
        );
      } catch {
        clearTimeout(timeoutId);
        reject(new Error("Chrome runtime error"));
      }
    } else {
      clearTimeout(timeoutId);
      reject(new Error("Extension not available"));
    }
  });
}

/**
 * Listen for events from the extension
 */
export function onExtensionEvent(
  callback: (event: { type: string; data: any }) => void,
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (
      event.data?.type?.startsWith("AI_RESELL_AGENT_") ||
      event.data?.type === "LISTING_COMPLETED" ||
      event.data?.type === "LISTING_FAILED"
    ) {
      callback(event.data);
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
