/**
 * AI Resell Agent - eBay Content Script
 * Handles login detection and automated listing creation on eBay
 */

console.log("[AI Resell Agent] eBay content script loaded");

// Check if user is logged in
function checkLoginStatus() {
  // eBay shows different elements when logged in
  const accountMenu = document.querySelector(
    '#gh-ug, [data-testid="uxf-nav-account"]',
  );
  const signInLink = document.querySelector('a[href*="signin"]');
  const myEbayLink = document.querySelector('a[href*="/myb/"]');

  const isLoggedIn =
    !!(accountMenu || myEbayLink) &&
    !signInLink?.textContent?.toLowerCase().includes("sign in");

  console.log("[AI Resell Agent] eBay login status:", isLoggedIn);

  // Notify background script
  chrome.runtime.sendMessage({
    type: "UPDATE_LOGIN_STATUS",
    marketplace: "ebay",
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
  element.dispatchEvent(new Event("blur", { bubbles: true }));
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
      imageUrls.slice(0, 24).map(async (url, index) => {
        // eBay allows up to 24 images
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

// Select condition from dropdown
async function selectCondition(condition) {
  const conditionMap = {
    new: "New",
    new_with_tags: "New with tags",
    new_without_tags: "New without tags",
    like_new: "Pre-owned",
    good: "Pre-owned",
    fair: "Pre-owned",
    poor: "For parts or not working",
  };

  try {
    // eBay uses different condition selectors
    const conditionSelect = await waitForElement(
      'select[name="condition"], [data-testid="condition-select"]',
    );
    if (conditionSelect) {
      const targetCondition =
        conditionMap[condition?.toLowerCase()] || "Pre-owned";

      // Find matching option
      const options = conditionSelect.querySelectorAll("option");
      for (const option of options) {
        if (
          option.textContent
            .toLowerCase()
            .includes(targetCondition.toLowerCase())
        ) {
          conditionSelect.value = option.value;
          conditionSelect.dispatchEvent(new Event("change", { bubbles: true }));
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
  console.log("[AI Resell Agent] Filling eBay listing form:", listing);

  try {
    // Wait for page to be ready
    await sleep(2000);

    // eBay's listing flow is multi-step, this handles the basic fields

    // Upload images first
    if (listing.images && listing.images.length > 0) {
      console.log("[AI Resell Agent] Uploading images...");
      await uploadImages(listing.images);
      await sleep(2000);
    }

    // Fill title
    const titleInput = await waitForElement(
      'input[name="title"], input[data-testid="title-input"], #title, input[placeholder*="title" i]',
    );
    if (titleInput) {
      await humanType(titleInput, listing.title);
      await sleep(500);
    }

    // Select condition
    if (listing.condition) {
      await selectCondition(listing.condition);
    }

    // Fill description (eBay may use rich text editor)
    try {
      const descInput = await waitForElement(
        'textarea[name="description"], #description, [data-testid="description-input"]',
      );
      if (descInput) {
        await humanType(descInput, listing.description || "");
        await sleep(500);
      }
    } catch (e) {
      // Try iframe for rich text editor
      const iframe = document.querySelector('iframe[id*="description"]');
      if (iframe) {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        const body = iframeDoc.body;
        if (body) {
          body.innerHTML = listing.description || "";
        }
      }
    }

    // Fill price
    const priceInput = await waitForElement(
      'input[name="price"], input[data-testid="price-input"], #price',
    );
    if (priceInput) {
      await humanType(priceInput, listing.price.toString());
      await sleep(500);
    }

    // Fill brand if there's a field
    if (listing.brand) {
      try {
        const brandInput = document.querySelector(
          'input[name="brand"], input[placeholder*="brand" i]',
        );
        if (brandInput) {
          await humanType(brandInput, listing.brand);
          await sleep(500);
        }
      } catch (e) {
        // Brand field might not exist for all categories
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
    // eBay may have multiple steps - look for "List item" or "Submit" button
    const submitBtn = await waitForElement(
      'button[data-testid="submit-btn"], button:contains("List item"), button:contains("List it"), input[type="submit"]',
    );

    if (submitBtn) {
      await humanClick(submitBtn);
      await sleep(5000); // eBay can take longer

      // Check for success - eBay shows item number
      const successIndicator = document.querySelector(
        '[data-testid="listing-success"], .success-message, [class*="success"]',
      );
      const itemNumber =
        document.body.textContent.match(/Item number:\s*(\d+)/i);

      if (successIndicator || itemNumber) {
        const listingId = itemNumber ? itemNumber[1] : null;
        const url = listingId ? `https://www.ebay.com/itm/${listingId}` : null;
        return { success: true, url, listingId };
      }
    }

    return { success: false, error: "Could not complete submission" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[AI Resell Agent] eBay received message:", message.type);

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
      return true;

    case "SUBMIT_LISTING":
      (async () => {
        const submitResult = await submitListing();

        // Notify background of result
        chrome.runtime.sendMessage({
          type: submitResult.success ? "LISTING_CREATED" : "LISTING_FAILED",
          marketplace: "ebay",
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
