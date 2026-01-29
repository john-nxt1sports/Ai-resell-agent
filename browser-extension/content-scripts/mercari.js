/**
 * AI Resell Agent - Mercari Content Script
 * Handles login detection and automated listing creation on Mercari
 * Enhanced with 2026 Best Practices
 *
 * Features:
 * - Anti-detection with human-like behavior
 * - Retry logic with exponential backoff
 * - Enhanced error handling
 * - Image validation
 *
 * @version 3.0.0
 * @updated 2026-01-29
 */

console.log("[AI Resell Agent] Mercari content script v3.0 loaded");

// Check if user is logged in
function checkLoginStatus() {
  // Mercari shows different elements when logged in
  const profileMenu = document.querySelector(
    '[data-testid="AccountMenu"], [aria-label="Account menu"]',
  );
  const loginLink = document.querySelector('a[href*="/login"]');
  const sellButton = document.querySelector('a[href="/sell"]');

  // Also check for login button by looking at button text
  const allButtons = document.querySelectorAll("button");
  let hasLoginButton = !!loginLink;
  for (const btn of allButtons) {
    if (
      btn.textContent.toLowerCase().includes("log in") ||
      btn.textContent.toLowerCase().includes("sign in")
    ) {
      hasLoginButton = true;
      break;
    }
  }

  // Check for user-specific elements
  const isLoggedIn = !!(profileMenu || (sellButton && !hasLoginButton));

  console.log("[AI Resell Agent] Mercari login status:", isLoggedIn);

  // Notify background script
  chrome.runtime.sendMessage({
    type: "UPDATE_LOGIN_STATUS",
    marketplace: "mercari",
    isLoggedIn,
  });

  return isLoggedIn;
}

// Wait for element to appear
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        return;
      }

      setTimeout(check, 200);
    };

    check();
  });
}

// Simulate human-like typing with variance (2026 enhancement)
async function humanType(element, text) {
  element.focus();
  element.value = "";

  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: char }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: char }));
    
    // Variable typing speed
    let delay = 50 + Math.random() * 50;
    // Occasional pause for "thinking"
    if (Math.random() < 0.02) {
      delay += Math.random() * 200;
    }
    await sleep(delay, false);
  }

  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

// Sleep helper with jitter (2026 anti-detection)
function sleep(ms, addJitter = true) {
  if (addJitter) {
    const jitter = ms * 0.3 * (Math.random() - 0.5) * 2;
    ms = Math.max(0, Math.round(ms + jitter));
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Click element with human-like behavior
async function humanClick(element) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(300);
  element.click();
}

// Upload images from URLs with validation (2026 enhancement)
async function uploadImages(imageUrls) {
  try {
    const fileInput = await waitForElement(
      'input[type="file"][accept*="image"]',
    );

    // Fetch images and create File objects with validation
    const files = await Promise.all(
      imageUrls.slice(0, 12).map(async (url, index) => {
        // Mercari allows up to 12 images
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          
          const blob = await response.blob();
          
          // Validate image type and size (2026)
          if (!blob.type.startsWith("image/") || blob.size === 0) {
            console.warn(`[AI Resell Agent] Invalid image at index ${index}`);
            return null;
          }
          
          return new File([blob], `image_${index}.jpg`, { type: "image/jpeg" });
        } catch (error) {
          console.warn(`[AI Resell Agent] Failed to fetch image ${index}:`, error);
          return null;
        }
      }),
    );

    // Filter out failed downloads
    const validFiles = files.filter(f => f !== null);
    
    if (validFiles.length === 0) {
      console.error("[AI Resell Agent] No valid images to upload");
      return false;
    }

    // Create a DataTransfer to simulate file selection
    const dataTransfer = new DataTransfer();
    validFiles.forEach((file) => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;

    // Trigger change event
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for upload to complete
    await sleep(2000 * validFiles.length);

    console.log(`[AI Resell Agent] Uploaded ${validFiles.length} images successfully`);
    return true;
  } catch (error) {
    console.error("[AI Resell Agent] Error uploading images:", error);
    return false;
  }
}

// Select condition from dropdown
async function selectCondition(condition) {
  const conditionMap = {
    new: "New",
    like_new: "Like new",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };

  try {
    // Click condition dropdown - try multiple selectors
    let conditionBtn = document.querySelector(
      '[data-testid="condition-select"], [aria-label*="condition" i]',
    );

    // If not found, look for button with "Condition" text
    if (!conditionBtn) {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent.includes("Condition")) {
          conditionBtn = btn;
          break;
        }
      }
    }

    if (conditionBtn) {
      await humanClick(conditionBtn);
      await sleep(500);

      // Find matching option
      const targetCondition =
        conditionMap[condition?.toLowerCase()] || condition;
      const options = document.querySelectorAll(
        '[role="option"], [role="menuitem"], li',
      );

      for (const option of options) {
        if (
          option.textContent
            .toLowerCase()
            .includes(targetCondition.toLowerCase())
        ) {
          await humanClick(option);
          await sleep(300);
          break;
        }
      }
    }
  } catch (error) {
    console.log("[AI Resell Agent] Could not select condition:", error);
  }
}

// Fill in the listing form
async function fillListingForm(listing) {
  console.log("[AI Resell Agent] Filling Mercari listing form:", listing);

  try {
    // Wait for page to be ready
    await sleep(2000);

    // Upload images first
    if (listing.images && listing.images.length > 0) {
      console.log("[AI Resell Agent] Uploading images...");
      await uploadImages(listing.images);
      await sleep(2000);
    }

    // Fill title
    const titleInput = await waitForElement(
      'input[name="name"], input[data-testid="title-input"], input[placeholder*="title" i]',
    );
    if (titleInput) {
      await humanType(titleInput, listing.title);
      await sleep(500);
    }

    // Fill description
    const descInput = await waitForElement(
      'textarea[name="description"], textarea[data-testid="description-input"], textarea[placeholder*="description" i]',
    );
    if (descInput) {
      await humanType(descInput, listing.description || "");
      await sleep(500);
    }

    // Select condition
    if (listing.condition) {
      await selectCondition(listing.condition);
    }

    // Fill brand
    if (listing.brand) {
      const brandInput = await waitForElement(
        'input[name="brand"], input[data-testid="brand-input"], input[placeholder*="brand" i]',
      );
      if (brandInput) {
        await humanType(brandInput, listing.brand);
        await sleep(500);
      }
    }

    // Fill price
    const priceInput = await waitForElement(
      'input[name="price"], input[data-testid="price-input"], input[placeholder*="price" i]',
    );
    if (priceInput) {
      await humanType(priceInput, listing.price.toString());
      await sleep(500);
    }

    // Shipping - Mercari often has shipping options
    try {
      const shippingOptions = document.querySelectorAll(
        '[data-testid="shipping-option"], input[name="shipping"]',
      );
      if (shippingOptions.length > 0) {
        // Select first shipping option (usually seller pays)
        await humanClick(shippingOptions[0]);
      }
    } catch (e) {
      console.log("[AI Resell Agent] Could not select shipping");
    }

    console.log("[AI Resell Agent] Form filled successfully");
    return { success: true };
  } catch (error) {
    console.error("[AI Resell Agent] Error filling form:", error);
    return { success: false, error: error.message };
  }
}

// Submit the listing
async function submitListing() {
  try {
    // Try to find submit button with multiple approaches
    let submitBtn = document.querySelector(
      'button[data-testid="submit-btn"], button[type="submit"]',
    );

    // If not found, look for button with "List" text
    if (!submitBtn) {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (
          text.includes("list item") ||
          text === "list" ||
          text.includes("publish")
        ) {
          submitBtn = btn;
          break;
        }
      }
    }

    if (submitBtn) {
      await humanClick(submitBtn);
      await sleep(3000);

      // Check for success
      const currentUrl = window.location.href;

      if (currentUrl.includes("/item/") || currentUrl.includes("/product/")) {
        return { success: true, url: currentUrl };
      }

      // Look for success message
      const successMessage = document.querySelector(
        '[data-testid="success-message"], .success',
      );
      if (successMessage) {
        return { success: true };
      }
    }

    return { success: false, error: "Could not complete submission" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Resell Agent] Mercari received message:", message.type);

  switch (message.type) {
    case "CHECK_LOGIN_STATUS":
      const isLoggedIn = checkLoginStatus();
      sendResponse({ isLoggedIn });
      break;

    case "FILL_LISTING":
      (async () => {
        const fillResult = await fillListingForm(message.listing);
        sendResponse(fillResult);
      })();
      return true; // Keep channel open for async

    case "SUBMIT_LISTING":
      (async () => {
        const submitResult = await submitListing();

        // Notify background of result
        chrome.runtime.sendMessage({
          type: submitResult.success ? "LISTING_CREATED" : "LISTING_FAILED",
          marketplace: "mercari",
          listingData: message.listing,
          result: submitResult,
          error: submitResult.error,
        });

        sendResponse(submitResult);
      })();
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// Check login status on page load
setTimeout(checkLoginStatus, 1000);
