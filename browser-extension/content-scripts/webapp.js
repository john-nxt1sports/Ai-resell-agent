/**
 * AI Resell Agent - Web App Content Script
 * Injected into the AI Resell Agent web app to enable communication with extension
 */

console.log("[AI Resell Agent] Web app content script loaded");

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
