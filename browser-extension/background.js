/**
 * AI Resell Agent - Chrome Extension Background Service Worker
 * Handles communication between the web app and content scripts
 */

// Configuration
const CONFIG = {
  APP_URL: "http://localhost:3000", // Change to production URL when deployed
  MARKETPLACES: {
    poshmark: {
      baseUrl: "https://poshmark.com",
      createListingUrl: "https://poshmark.com/create-listing",
      loginUrl: "https://poshmark.com/login",
      checkLoggedIn: "https://poshmark.com/closet",
    },
    mercari: {
      baseUrl: "https://www.mercari.com",
      createListingUrl: "https://www.mercari.com/sell",
      loginUrl: "https://www.mercari.com/login",
      checkLoggedIn: "https://www.mercari.com/mypage",
    },
    ebay: {
      baseUrl: "https://www.ebay.com",
      createListingUrl: "https://www.ebay.com/sl/sell",
      loginUrl: "https://signin.ebay.com/signin",
      checkLoggedIn: "https://www.ebay.com/mys/home",
    },
  },
};

// Store for pending jobs and connection state
let pendingJobs = [];
let connectedMarketplaces = {};
let extensionId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("[AI Resell Agent] Extension installed");
  extensionId = chrome.runtime.id;

  // Initialize storage
  chrome.storage.local.set({
    connectedMarketplaces: {},
    pendingJobs: [],
    settings: {
      autoPost: true,
      notifications: true,
    },
  });
});

// Listen for messages from web app (external)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    console.log("[AI Resell Agent] External message received:", message.type);

    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async response
  },
);

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Resell Agent] Internal message received:", message.type);

  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Main message handler
async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case "PING":
        sendResponse({ success: true, extensionId: chrome.runtime.id });
        break;

      case "GET_EXTENSION_ID":
        sendResponse({ extensionId: chrome.runtime.id });
        break;

      case "CHECK_CONNECTION":
        const status = await checkMarketplaceConnections();
        sendResponse({ success: true, ...status });
        break;

      case "CHECK_MARKETPLACE_LOGIN":
        const loginStatus = await checkMarketplaceLogin(message.marketplace);
        sendResponse(loginStatus);
        break;

      case "CREATE_LISTING":
        const result = await createListing(
          message.marketplace,
          message.listing,
        );
        sendResponse(result);
        break;

      case "QUEUE_LISTINGS":
        const queueResult = await queueListings(
          message.listings,
          message.marketplaces,
        );
        sendResponse(queueResult);
        break;

      case "GET_PENDING_JOBS":
        const jobs = await getPendingJobs();
        sendResponse({ success: true, jobs });
        break;

      case "PROCESS_NEXT_JOB":
        const jobResult = await processNextJob();
        sendResponse(jobResult);
        break;

      case "LISTING_CREATED":
        // Content script reporting successful listing creation
        await handleListingCreated(
          message.marketplace,
          message.listingData,
          message.result,
        );
        sendResponse({ success: true });
        break;

      case "LISTING_FAILED":
        // Content script reporting failure
        await handleListingFailed(
          message.marketplace,
          message.listingData,
          message.error,
        );
        sendResponse({ success: true });
        break;

      case "UPDATE_LOGIN_STATUS":
        await updateLoginStatus(message.marketplace, message.isLoggedIn);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: "Unknown message type" });
    }
  } catch (error) {
    console.error("[AI Resell Agent] Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Check if user is logged into marketplaces
async function checkMarketplaceConnections() {
  const results = {};

  for (const [marketplace, config] of Object.entries(CONFIG.MARKETPLACES)) {
    try {
      results[marketplace] = await checkMarketplaceLogin(marketplace);
    } catch (error) {
      results[marketplace] = { isLoggedIn: false, error: error.message };
    }
  }

  // Update storage
  await chrome.storage.local.set({ connectedMarketplaces: results });

  return { marketplaces: results };
}

// Check login status for a specific marketplace
async function checkMarketplaceLogin(marketplace) {
  const config = CONFIG.MARKETPLACES[marketplace];
  if (!config) {
    return { isLoggedIn: false, error: "Unknown marketplace" };
  }

  try {
    // Try to find an existing tab with the marketplace
    const tabs = await chrome.tabs.query({ url: `${config.baseUrl}/*` });

    if (tabs.length > 0) {
      // Send message to content script to check login
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: "CHECK_LOGIN_STATUS",
      });
      return { isLoggedIn: response?.isLoggedIn || false, tabId: tabs[0].id };
    }

    // No existing tab - we'll need user to verify
    return { isLoggedIn: false, needsVerification: true };
  } catch (error) {
    return { isLoggedIn: false, error: error.message };
  }
}

// Update login status in storage
async function updateLoginStatus(marketplace, isLoggedIn) {
  const { connectedMarketplaces = {} } = await chrome.storage.local.get(
    "connectedMarketplaces",
  );
  connectedMarketplaces[marketplace] = { isLoggedIn, lastChecked: Date.now() };
  await chrome.storage.local.set({ connectedMarketplaces });
}

// Queue listings for posting
async function queueListings(listings, marketplaces) {
  const { pendingJobs = [] } = await chrome.storage.local.get("pendingJobs");

  const newJobs = [];
  for (const listing of listings) {
    for (const marketplace of marketplaces) {
      const job = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        listing,
        marketplace,
        status: "pending",
        createdAt: Date.now(),
        attempts: 0,
      };
      newJobs.push(job);
      pendingJobs.push(job);
    }
  }

  await chrome.storage.local.set({ pendingJobs });

  // Notify popup if open
  chrome.runtime
    .sendMessage({ type: "JOBS_UPDATED", jobs: pendingJobs })
    .catch(() => {});

  return { success: true, jobsCreated: newJobs.length, jobs: newJobs };
}

// Get pending jobs
async function getPendingJobs() {
  const { pendingJobs = [] } = await chrome.storage.local.get("pendingJobs");
  return pendingJobs;
}

// Process the next pending job
async function processNextJob() {
  const { pendingJobs = [] } = await chrome.storage.local.get("pendingJobs");

  const nextJob = pendingJobs.find((job) => job.status === "pending");
  if (!nextJob) {
    return { success: false, error: "No pending jobs" };
  }

  // Update job status
  nextJob.status = "processing";
  nextJob.attempts += 1;
  nextJob.startedAt = Date.now();
  await chrome.storage.local.set({ pendingJobs });

  // Create listing
  return await createListing(nextJob.marketplace, nextJob.listing, nextJob.id);
}

// Create a listing on a marketplace
async function createListing(marketplace, listing, jobId = null) {
  const config = CONFIG.MARKETPLACES[marketplace];
  if (!config) {
    return { success: false, error: "Unknown marketplace" };
  }

  try {
    // Find or create tab for the marketplace
    let tabs = await chrome.tabs.query({ url: `${config.baseUrl}/*` });
    let tab;

    if (tabs.length > 0) {
      tab = tabs[0];
      // Navigate to create listing page
      await chrome.tabs.update(tab.id, {
        url: config.createListingUrl,
        active: true,
      });
    } else {
      // Create new tab
      tab = await chrome.tabs.create({
        url: config.createListingUrl,
        active: true,
      });
    }

    // Wait for page to load
    await waitForTabLoad(tab.id);

    // Send listing data to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "FILL_LISTING",
      listing,
      jobId,
    });

    return response;
  } catch (error) {
    console.error(
      `[AI Resell Agent] Error creating listing on ${marketplace}:`,
      error,
    );
    return { success: false, error: error.message };
  }
}

// Wait for tab to finish loading
function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") {
          // Add small delay for JS to initialize
          setTimeout(resolve, 1000);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error("Tab load timeout"));
          return;
        }

        setTimeout(checkTab, 500);
      } catch (error) {
        reject(error);
      }
    };

    checkTab();
  });
}

// Handle successful listing creation
async function handleListingCreated(marketplace, listingData, result) {
  const { pendingJobs = [] } = await chrome.storage.local.get("pendingJobs");

  // Find and update the job
  const jobIndex = pendingJobs.findIndex(
    (job) => job.status === "processing" && job.marketplace === marketplace,
  );

  if (jobIndex !== -1) {
    pendingJobs[jobIndex].status = "completed";
    pendingJobs[jobIndex].completedAt = Date.now();
    pendingJobs[jobIndex].result = result;
    await chrome.storage.local.set({ pendingJobs });
  }

  // Notify web app
  notifyWebApp("LISTING_COMPLETED", {
    marketplace,
    listing: listingData,
    result,
  });

  // Show notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Listing Created!",
    message: `Successfully posted "${listingData.title}" to ${marketplace}`,
  });
}

// Handle listing failure
async function handleListingFailed(marketplace, listingData, error) {
  const { pendingJobs = [] } = await chrome.storage.local.get("pendingJobs");

  const jobIndex = pendingJobs.findIndex(
    (job) => job.status === "processing" && job.marketplace === marketplace,
  );

  if (jobIndex !== -1) {
    const job = pendingJobs[jobIndex];
    if (job.attempts < 3) {
      job.status = "pending"; // Retry
      job.lastError = error;
    } else {
      job.status = "failed";
      job.error = error;
      job.failedAt = Date.now();
    }
    await chrome.storage.local.set({ pendingJobs });
  }

  // Notify web app
  notifyWebApp("LISTING_FAILED", {
    marketplace,
    listing: listingData,
    error,
  });
}

// Notify the web app of events
async function notifyWebApp(eventType, data) {
  try {
    // Find tab with our web app
    const tabs = await chrome.tabs.query({ url: `${CONFIG.APP_URL}/*` });

    for (const tab of tabs) {
      chrome.tabs
        .sendMessage(tab.id, {
          type: eventType,
          data,
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error("[AI Resell Agent] Error notifying web app:", error);
  }
}

console.log("[AI Resell Agent] Background service worker started");
