/**
 * AI Resell Agent - Extension Popup Script
 */

const MARKETPLACES = [
  { id: "poshmark", name: "Poshmark", loginUrl: "https://poshmark.com/login" },
  { id: "mercari", name: "Mercari", loginUrl: "https://www.mercari.com/login" },
  { id: "ebay", name: "eBay", loginUrl: "https://signin.ebay.com/signin" },
  { id: "flyp", name: "Flyp", loginUrl: "https://tools.joinflyp.com" },
  { id: "depop", name: "Depop", loginUrl: "https://www.depop.com/login" },
];

// Get APP_URL from storage or use default
let APP_URL = "http://localhost:3000";

// Load configuration on startup
chrome.storage.local.get(["appUrl"], (result) => {
  if (result.appUrl) {
    APP_URL = result.appUrl;
  }
});

let marketplaceStatuses = {};
let pendingJobs = [];
let selectedView = "connections";

const wizardState = {
  images: [],
  step1Complete: false,
  step2Complete: false,
  productName: "",
  brand: "",
  size: "",
  category: "",
  notes: "",
};

const MAX_WIZARD_IMAGES = 10;

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  setupViewSwitcher();
  setupWizard();
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeAppUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function setView(nextView) {
  selectedView = nextView;

  document.querySelectorAll(".view-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.view === nextView);
  });

  document
    .getElementById("panel-connections")
    .classList.toggle("active", nextView === "connections");
  document
    .getElementById("panel-new-listing")
    .classList.toggle("active", nextView === "new-listing");
}

function setupViewSwitcher() {
  document.querySelectorAll(".view-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const view = chip.dataset.view;
      if (view) setView(view);
    });
  });
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
          <div class="job-title">${escapeHtml(job.listing?.title || "Untitled")}</div>
          <div class="job-marketplace">${escapeHtml(job.marketplace || "unknown")}</div>
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
    chrome.tabs.create({ url: normalizeAppUrl(APP_URL) });
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

function setupWizard() {
  const dropzone = document.getElementById("wizardDropzone");
  const imageInput = document.getElementById("wizardImageInput");
  const confirmStep1Btn = document.getElementById("confirmStep1Btn");
  const confirmStep2Btn = document.getElementById("confirmStep2Btn");
  const launchBtn = document.getElementById("launchListingStudioBtn");
  const resetBtn = document.getElementById("resetWizardBtn");

  const bindInput = (id, key) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", (e) => {
      wizardState[key] = e.target.value;
      renderWizard();
    });
  };

  bindInput("productNameInput", "productName");
  bindInput("brandInput", "brand");
  bindInput("sizeInput", "size");
  bindInput("categoryInput", "category");
  bindInput("productInfoInput", "notes");

  dropzone.addEventListener("click", () => imageInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragging");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragging");
  });

  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragging");
    const files = Array.from(e.dataTransfer.files || []);
    showDropzoneStatus(dropzone, files);
    await addWizardImages(files);
    clearDropzoneStatus(dropzone);
    renderWizard();
  });

  imageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    showDropzoneStatus(dropzone, files);
    await addWizardImages(files);
    clearDropzoneStatus(dropzone);
    imageInput.value = "";
    renderWizard();
  });

  confirmStep1Btn.addEventListener("click", () => {
    if (wizardState.images.length === 0) {
      alert("Add at least one image before confirming Step 1.");
      return;
    }
    wizardState.step1Complete = true;
    renderWizard();
  });

  confirmStep2Btn.addEventListener("click", () => {
    wizardState.step2Complete = true;
    renderWizard();
  });

  launchBtn.addEventListener("click", async () => {
    await launchListingStudioWithDraft();
  });

  resetBtn.addEventListener("click", async () => {
    resetWizardState();
    await chrome.storage.local.remove(["extensionListingDraft"]);
    renderWizard();
  });

  renderWizard();
}

function resetWizardState() {
  wizardState.images = [];
  wizardState.step1Complete = false;
  wizardState.step2Complete = false;
  wizardState.productName = "";
  wizardState.brand = "";
  wizardState.size = "";
  wizardState.category = "";
  wizardState.notes = "";

  [
    "productNameInput",
    "brandInput",
    "sizeInput",
    "categoryInput",
    "productInfoInput",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
}

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Show a processing status in the dropzone while HEIC conversion runs.
 */
function showDropzoneStatus(dropzone, files) {
  const hasHeic = files.some((f) => window.heicUtils?.isHeicFile(f));
  if (!hasHeic) return;
  const label = dropzone.querySelector("p");
  if (label) {
    label.dataset.originalText = label.textContent;
    label.textContent = "Converting HEIC images…";
    label.style.color = "#8b5cf6";
  }
}

function clearDropzoneStatus(dropzone) {
  const label = dropzone.querySelector("p");
  if (label?.dataset.originalText) {
    label.textContent = label.dataset.originalText;
    label.style.color = "";
    delete label.dataset.originalText;
  }
}

function createHeicPlaceholderDataUrl(fileName) {
  const safeName = String(fileName || "HEIC Image")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#1f2937" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill="url(#g)" rx="24" />
      <text x="50%" y="46%" text-anchor="middle" fill="#c084fc" font-size="64" font-family="Arial, sans-serif" font-weight="700">HEIC</text>
      <text x="50%" y="55%" text-anchor="middle" fill="#e5e7eb" font-size="22" font-family="Arial, sans-serif">Preview generated in app</text>
      <text x="50%" y="63%" text-anchor="middle" fill="#9ca3af" font-size="16" font-family="Arial, sans-serif">${safeName}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function addWizardImages(files) {
  // Accept standard image types + HEIC/HEIF (iOS may send empty MIME type)
  const imageFiles = files.filter(
    (file) =>
      file.type.startsWith("image/") || window.heicUtils?.isHeicFile(file),
  );
  if (imageFiles.length === 0) {
    alert("No supported images detected. Try JPG/PNG/WebP or HEIC/HEIF files.");
    return;
  }

  const availableSlots = MAX_WIZARD_IMAGES - wizardState.images.length;
  if (availableSlots <= 0) {
    alert(`Maximum ${MAX_WIZARD_IMAGES} images allowed.`);
    return;
  }

  const selected = imageFiles.slice(0, availableSlots);
  const converted = [];
  const fallbackHeic = [];

  for (const file of selected) {
    // Convert HEIC/HEIF → JPEG before preview (browsers can't display HEIC natively)
    let processedFile = file;
    let dataUrl = "";
    let sourceDataUrl;
    let needsHeicConversion = false;

    if (window.heicUtils?.isHeicFile(file)) {
      try {
        const result = await window.heicUtils.convertHeicIfNeeded(file);
        processedFile = result.file;
      } catch (err) {
        console.warn(
          "[Wizard] HEIC conversion unavailable in extension, using fallback:",
          file.name,
          err,
        );
        sourceDataUrl = await fileToDataUrl(file);
        dataUrl = createHeicPlaceholderDataUrl(file.name);
        needsHeicConversion = true;
        fallbackHeic.push(file.name);
      }
    }

    if (!dataUrl) {
      dataUrl = await fileToDataUrl(processedFile);
    }

    converted.push({
      id:
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: processedFile.name,
      type: processedFile.type,
      size: processedFile.size,
      dataUrl,
      sourceDataUrl,
      needsHeicConversion,
    });
  }

  if (fallbackHeic.length > 0) {
    const names = fallbackHeic.slice(0, 2).join(", ");
    const more =
      fallbackHeic.length > 2 ? ` and ${fallbackHeic.length - 2} more` : "";
    alert(
      `HEIC preview fallback applied for: ${names}${more}.\nThese files were added and will be converted in the web app.`,
    );
  }

  if (selected.length > 0 && converted.length === 0) {
    alert(
      "No images were added. HEIC conversion failed for all selected files.",
    );
  }

  wizardState.images = [...wizardState.images, ...converted];
  wizardState.step1Complete = false;
}

function renderWizard() {
  const previewRow = document.getElementById("wizardPreviewRow");
  const confirmStep1Btn = document.getElementById("confirmStep1Btn");
  const step1Status = document.getElementById("step1Status");
  const step2Status = document.getElementById("step2Status");
  const step2Card = document.getElementById("wizardStep2");
  const step3Card = document.getElementById("wizardStep3");
  const launchBtn = document.getElementById("launchListingStudioBtn");
  const summary = document.getElementById("wizardSummary");

  // Build preview grid safely using DOM APIs (avoids XSS via innerHTML)
  previewRow.innerHTML = "";
  for (const img of wizardState.images) {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";

    const imgEl = document.createElement("img");
    imgEl.src = img.dataUrl;
    imgEl.alt = "preview";
    wrapper.appendChild(imgEl);

    const btn = document.createElement("button");
    btn.className = "preview-remove";
    btn.textContent = "\u00d7";
    btn.addEventListener("click", () => {
      wizardState.images = wizardState.images.filter((i) => i.id !== img.id);
      if (wizardState.images.length === 0) wizardState.step1Complete = false;
      renderWizard();
    });
    wrapper.appendChild(btn);

    previewRow.appendChild(wrapper);
  }

  confirmStep1Btn.disabled = wizardState.images.length === 0;
  step1Status.classList.toggle("show", wizardState.step1Complete);
  step2Status.classList.toggle("show", wizardState.step2Complete);

  step2Card.style.opacity = wizardState.step1Complete ? "1" : "0.45";
  step2Card.style.pointerEvents = wizardState.step1Complete ? "auto" : "none";

  const canOpenStep3 = wizardState.step1Complete && wizardState.step2Complete;
  step3Card.style.opacity = canOpenStep3 ? "1" : "0.45";
  step3Card.style.pointerEvents = canOpenStep3 ? "auto" : "none";

  launchBtn.disabled = !canOpenStep3;

  const step1Pill = document.getElementById("pill-step-1");
  const step2Pill = document.getElementById("pill-step-2");
  const step3Pill = document.getElementById("pill-step-3");

  step1Pill.classList.toggle("complete", wizardState.step1Complete);
  step2Pill.classList.toggle("complete", wizardState.step2Complete);
  step3Pill.classList.toggle("active", canOpenStep3);

  if (!canOpenStep3) {
    summary.textContent =
      "Complete Steps 1 and 2 to launch with your prepared draft.";
  } else {
    summary.innerHTML = `Prepared draft: <strong>${wizardState.images.length}</strong> image(s), brand: <strong>${escapeHtml(wizardState.brand || "n/a")}</strong>, category: <strong>${escapeHtml(wizardState.category || "n/a")}</strong>.`;
  }
}

async function launchListingStudioWithDraft() {
  if (!wizardState.step1Complete || !wizardState.step2Complete) {
    alert("Complete Step 1 and Step 2 before launching Step 3.");
    return;
  }

  const draftPayload = {
    source: "extension-popup",
    createdAt: Date.now(),
    images: wizardState.images,
    fields: {
      title: wizardState.productName,
      brand: wizardState.brand,
      size: wizardState.size,
      category: wizardState.category,
      notes: wizardState.notes,
    },
  };

  await chrome.storage.local.set({ extensionListingDraft: draftPayload });

  const listingStudioUrl = `${normalizeAppUrl(APP_URL)}/listings/new?extensionDraft=1`;
  chrome.tabs.create({ url: listingStudioUrl });
}

// Listen for job updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "JOBS_UPDATED") {
    pendingJobs = message.jobs || [];
    updateJobsUI();
  }
});
