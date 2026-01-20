/**
 * AI Resell Agent - Extension Popup Script
 */

const MARKETPLACES = [
  { id: "poshmark", name: "Poshmark", loginUrl: "https://poshmark.com/login" },
  { id: "mercari", name: "Mercari", loginUrl: "https://www.mercari.com/login" },
  { id: "ebay", name: "eBay", loginUrl: "https://signin.ebay.com/signin" },
  { id: "depop", name: "Depop", loginUrl: "https://www.depop.com/login" },
];

// Get APP_URL from storage or use default
let APP_URL = "http://localhost:3000";

// Load configuration on startup
chrome.storage.local.get(['appUrl'], (result) => {
  if (result.appUrl) {
    APP_URL = result.appUrl;
  }
});

let marketplaceStatuses = {};
let pendingJobs = [];

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await checkConnection();
  await loadMarketplaceStatuses();
  await loadPendingJobs();
  setupEventListeners();
});

// Check connection to background script
async function checkConnection() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "PING" });
    if (response?.success) {
      updateConnectionStatus(true);
    } else {
      updateConnectionStatus(false);
    }
  } catch (error) {
    console.error("Connection check failed:", error);
    updateConnectionStatus(false);
  }
}

// Update connection status UI
function updateConnectionStatus(connected) {
  const dot = document.getElementById("connectionDot");
  const status = document.getElementById("connectionStatus");

  if (connected) {
    dot.classList.remove("disconnected");
    status.textContent = "Extension Active";
  } else {
    dot.classList.add("disconnected");
    status.textContent = "Not Connected";
  }
}

// Load marketplace login statuses
async function loadMarketplaceStatuses() {
  const listElement = document.getElementById("marketplaceList");
  const loginPrompt = document.getElementById("loginPrompt");

  // Show loading state
  listElement.innerHTML = MARKETPLACES.map(
    (m) => `
    <div class="marketplace-item">
      <div class="marketplace-info">
        <div class="marketplace-icon ${m.id}">${m.name.charAt(0)}</div>
        <div>
          <div class="marketplace-name">${m.name}</div>
          <div class="marketplace-status">Checking...</div>
        </div>
      </div>
      <span class="status-badge checking">
        <div class="spinner" style="display: inline-block;"></div>
      </span>
    </div>
  `,
  ).join("");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_CONNECTION",
    });
    marketplaceStatuses = response?.marketplaces || {};

    // Check if any marketplace needs login
    let anyNeedsLogin = false;

    listElement.innerHTML = MARKETPLACES.map((m) => {
      const status = marketplaceStatuses[m.id];
      const isLoggedIn = status?.isLoggedIn || false;

      if (!isLoggedIn) anyNeedsLogin = true;

      return `
        <div class="marketplace-item" data-marketplace="${m.id}">
          <div class="marketplace-info">
            <div class="marketplace-icon ${m.id}">${m.name.charAt(0)}</div>
            <div>
              <div class="marketplace-name">${m.name}</div>
              <div class="marketplace-status">${isLoggedIn ? "Ready to post" : "Not logged in"}</div>
            </div>
          </div>
          ${
            isLoggedIn
              ? '<span class="status-badge connected">✓ Connected</span>'
              : `<button class="btn btn-outline btn-sm login-btn" data-url="${m.loginUrl}">Login</button>`
          }
        </div>
      `;
    }).join("");

    // Show login prompt if needed
    loginPrompt.style.display = anyNeedsLogin ? "block" : "none";

    // Add login button handlers
    document.querySelectorAll(".login-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const url = e.target.dataset.url;
        chrome.tabs.create({ url });
      });
    });
  } catch (error) {
    console.error("Failed to load marketplace statuses:", error);
    listElement.innerHTML =
      '<div class="empty-state">Failed to check marketplace statuses</div>';
  }
}

// Load pending jobs
async function loadPendingJobs() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_PENDING_JOBS",
    });
    pendingJobs = response?.jobs || [];
    updateJobsUI();
  } catch (error) {
    console.error("Failed to load pending jobs:", error);
  }
}

// Update jobs UI
function updateJobsUI() {
  const countElement = document.getElementById("pendingCount");
  const listElement = document.getElementById("jobList");
  const processBtn = document.getElementById("processBtn");

  const pendingOnly = pendingJobs.filter((j) => j.status === "pending");
  countElement.textContent = pendingOnly.length;

  if (pendingOnly.length === 0) {
    listElement.innerHTML = '<div class="empty-state">No pending jobs</div>';
    processBtn.disabled = true;
  } else {
    listElement.innerHTML = pendingOnly
      .slice(0, 5)
      .map(
        (job) => `
      <div class="job-item">
        <div>
          <div class="job-title">${job.listing?.title || "Untitled"}</div>
          <div class="job-marketplace">${job.marketplace}</div>
        </div>
        <span class="status-badge ${job.status}">${job.status}</span>
      </div>
    `,
      )
      .join("");

    if (pendingOnly.length > 5) {
      listElement.innerHTML += `
        <div class="empty-state">+${pendingOnly.length - 5} more jobs</div>
      `;
    }

    // Enable process button if any marketplace is logged in
    const anyLoggedIn = Object.values(marketplaceStatuses).some(
      (s) => s?.isLoggedIn,
    );
    processBtn.disabled = !anyLoggedIn;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Open app button
  document.getElementById("openAppBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: APP_URL });
  });

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", async () => {
    await loadMarketplaceStatuses();
    await loadPendingJobs();
  });

  // Process button
  document.getElementById("processBtn").addEventListener("click", async () => {
    const btn = document.getElementById("processBtn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "PROCESS_NEXT_JOB",
      });
      if (response?.success) {
        await loadPendingJobs();
      } else {
        alert("Failed to process job: " + (response?.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to process job:", error);
    }

    btn.disabled = false;
    btn.textContent = "Start Posting";
  });
}

// Listen for job updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "JOBS_UPDATED") {
    pendingJobs = message.jobs || [];
    updateJobsUI();
  }
});
