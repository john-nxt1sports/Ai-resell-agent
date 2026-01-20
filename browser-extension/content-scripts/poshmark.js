/**
 * AI Resell Agent - Poshmark Content Script
 * Handles login detection and automated listing creation on Poshmark
 */

console.log("[AI Resell Agent] Poshmark content script loaded");

// Check if user is logged in
function checkLoginStatus() {
  // Poshmark shows different elements when logged in
  const userMenu = document.querySelector('[data-test="user-nav"]');
  const loginButton = document.querySelector('[data-test="login-btn"]');
  const profileLink = document.querySelector('a[href*="/closet/"]');

  const isLoggedIn = !!(userMenu || profileLink) && !loginButton;

  console.log("[AI Resell Agent] Poshmark login status:", isLoggedIn);

  // Notify background script
  chrome.runtime.sendMessage({
    type: "UPDATE_LOGIN_STATUS",
    marketplace: "poshmark",
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

// Simulate human-like typing
async function humanType(element, text) {
  element.focus();
  element.value = "";

  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(50 + Math.random() * 50);
  }

  element.dispatchEvent(new Event("change", { bubbles: true }));
}

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Click element with human-like behavior
async function humanClick(element) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(300);
  element.click();
}

// Upload images from URLs
async function uploadImages(imageUrls) {
  try {
    const fileInput = await waitForElement(
      'input[type="file"][accept*="image"]',
    );

    // Fetch images and create File objects
    const files = await Promise.all(
      imageUrls.slice(0, 16).map(async (url, index) => {
        // Poshmark allows up to 16 images
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], `image_${index}.jpg`, { type: "image/jpeg" });
      }),
    );

    // Create a DataTransfer to simulate file selection
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;

    // Trigger change event
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait for upload to complete
    await sleep(2000 * files.length);

    return true;
  } catch (error) {
    console.error("[AI Resell Agent] Error uploading images:", error);
    return false;
  }
}

// Fill in the listing form
async function fillListingForm(listing) {
  console.log("[AI Resell Agent] Filling Poshmark listing form:", listing);

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
      'input[data-test="title-input"], input[name="title"], input[placeholder*="title" i]',
    );
    if (titleInput) {
      await humanType(titleInput, listing.title);
      await sleep(500);
    }

    // Fill description
    const descInput = await waitForElement(
      'textarea[data-test="description-input"], textarea[name="description"], textarea[placeholder*="description" i]',
    );
    if (descInput) {
      await humanType(descInput, listing.description || "");
      await sleep(500);
    }

    // Select category (Poshmark has a category selector)
    if (listing.category) {
      try {
        const categoryBtn = await waitForElement(
          '[data-test="category-selector"], button:contains("Category")',
        );
        if (categoryBtn) {
          await humanClick(categoryBtn);
          await sleep(500);
          // This is marketplace-specific - categories vary
        }
      } catch (e) {
        console.log("[AI Resell Agent] Could not select category");
      }
    }

    // Fill brand
    if (listing.brand) {
      const brandInput = await waitForElement(
        'input[data-test="brand-input"], input[name="brand"], input[placeholder*="brand" i]',
      );
      if (brandInput) {
        await humanType(brandInput, listing.brand);
        await sleep(500);
      }
    }

    // Fill size
    if (listing.size) {
      try {
        const sizeSelector = await waitForElement(
          '[data-test="size-selector"], select[name="size"]',
        );
        if (sizeSelector) {
          // Try to find and click the matching size
          const sizeOption = document.querySelector(
            `option[value="${listing.size}"], [data-size="${listing.size}"]`,
          );
          if (sizeOption) {
            sizeOption.click();
          }
        }
      } catch (e) {
        console.log("[AI Resell Agent] Could not select size");
      }
    }

    // Fill price
    const priceInput = await waitForElement(
      'input[data-test="price-input"], input[name="price"], input[placeholder*="price" i]',
    );
    if (priceInput) {
      await humanType(priceInput, listing.price.toString());
      await sleep(500);
    }

    // Fill original price if available
    if (listing.originalPrice) {
      const origPriceInput = document.querySelector(
        'input[data-test="original-price"], input[name="originalPrice"]',
      );
      if (origPriceInput) {
        await humanType(origPriceInput, listing.originalPrice.toString());
        await sleep(500);
      }
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
    const submitBtn = await waitForElement(
      'button[data-test="submit-btn"], button[type="submit"]:contains("List"), button:contains("Next")',
    );

    if (submitBtn) {
      await humanClick(submitBtn);
      await sleep(3000);

      // Check for success
      const successIndicator = document.querySelector(
        '[data-test="listing-success"], .success-message',
      );
      const currentUrl = window.location.href;

      if (successIndicator || currentUrl.includes("/listing/")) {
        // Extract listing URL
        const listingUrl = currentUrl.includes("/listing/") ? currentUrl : null;
        return { success: true, url: listingUrl };
      }
    }

    return { success: false, error: "Could not find submit button" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Resell Agent] Poshmark received message:", message.type);

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
          marketplace: "poshmark",
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
