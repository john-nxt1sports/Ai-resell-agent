/**
 * AI Resell Agent - Web App Content Script
 * Injected into the AI Resell Agent web app to enable communication with extension
 */

console.log("[AI Resell Agent] Web app content script loaded");

// Try to get auth token from localStorage on load
(async function initAuth() {
  try {
    // Check for Supabase auth token in localStorage
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(
      (k) => k.includes("supabase") && k.includes("auth"),
    );

    if (supabaseKey) {
      const authData = JSON.parse(localStorage.getItem(supabaseKey) || "{}");
      const accessToken = authData?.access_token;

      if (accessToken) {
        console.log("[AI Resell Agent] Found auth token, sending to extension");
        await chrome.runtime.sendMessage({
          type: "SET_AUTH_TOKEN",
          authToken: accessToken,
          apiUrl: window.location.origin,
        });
      }
    }
  } catch (e) {
    console.log("[AI Resell Agent] Could not get auth token:", e.message);
  }
})();

// Listen for messages from the web page
window.addEventListener("message", async (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) return;

  const { type, ...data } = event.data || {};

  if (!type?.startsWith("AI_RESELL_AGENT_")) return;

  console.log("[AI Resell Agent] Web page message:", type);

  try {
    switch (type) {
      case "AI_RESELL_AGENT_PING":
        // Respond to ping from web app
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_PONG",
            extensionId: chrome.runtime.id,
          },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_SET_AUTH":
        // Web app providing auth token
        await chrome.runtime.sendMessage({
          type: "SET_AUTH_TOKEN",
          authToken: data.authToken,
          apiUrl: data.apiUrl || window.location.origin,
        });
        window.postMessage(
          { type: "AI_RESELL_AGENT_AUTH_SET", success: true },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_CAPTURE_SESSION":
        // Trigger session capture for a marketplace
        const captureResponse = await chrome.runtime.sendMessage({
          type: "CAPTURE_SESSION",
          marketplace: data.marketplace,
        });
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_SESSION_CAPTURED",
            ...captureResponse,
          },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_GET_MARKETPLACES":
        // Forward to background and respond
        const marketplaceResponse = await chrome.runtime.sendMessage({
          type: "CHECK_CONNECTION",
        });
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_MARKETPLACES",
            marketplaces: marketplaceResponse?.marketplaces || {},
          },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_QUEUE_LISTINGS":
        // Forward queue request to background
        const queueResponse = await chrome.runtime.sendMessage({
          type: "QUEUE_LISTINGS",
          listings: data.listings,
          marketplaces: data.marketplaces,
        });
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_QUEUE_RESULT",
            ...queueResponse,
          },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_GET_JOBS":
        // Get pending jobs
        const jobsResponse = await chrome.runtime.sendMessage({
          type: "GET_PENDING_JOBS",
        });
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_JOBS",
            jobs: jobsResponse?.jobs || [],
          },
          "*",
        );
        break;

      case "AI_RESELL_AGENT_PROCESS_JOB":
        // Start processing next job
        const processResponse = await chrome.runtime.sendMessage({
          type: "PROCESS_NEXT_JOB",
        });
        window.postMessage(
          {
            type: "AI_RESELL_AGENT_PROCESS_RESULT",
            ...processResponse,
          },
          "*",
        );
        break;
    }
  } catch (error) {
    console.error("[AI Resell Agent] Error handling message:", error);
    window.postMessage(
      {
        type: `${type}_ERROR`,
        error: error.message,
      },
      "*",
    );
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward relevant messages to the web page
  if (
    message.type === "LISTING_COMPLETED" ||
    message.type === "LISTING_FAILED"
  ) {
    window.postMessage(message, "*");
  }
  sendResponse({ received: true });
});

// Announce presence to page
window.postMessage(
  {
    type: "AI_RESELL_AGENT_READY",
    extensionId: chrome.runtime.id,
  },
  "*",
);
