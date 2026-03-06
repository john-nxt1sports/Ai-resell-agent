/**
 * Offscreen Document – HEIC → JPEG Conversion Worker
 *
 * This script runs inside an offscreen HTML document that has a standard web
 * context (Workers, blob: URLs, etc.) — unlike the extension popup which is
 * subject to the strict extension CSP.
 *
 * The background service-worker creates this document on demand and forwards
 * HEIC ArrayBuffers from the popup.  We run heic2any here and send back
 * the converted JPEG ArrayBuffer.
 *
 * @version 1.0.0
 */

"use strict";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "CONVERT_HEIC_OFFSCREEN") return false;

  convertHeic(message)
    .then(sendResponse)
    .catch((err) => {
      console.error("[Offscreen] HEIC conversion failed:", err);
      sendResponse({ success: false, error: String(err) });
    });

  return true; // keep the channel open for async response
});

/**
 * Run heic2any on the received ArrayBuffer and return the JPEG data.
 *
 * @param {{ arrayBuffer: number[], fileName: string, quality?: number }} msg
 * @returns {Promise<{ success: true, jpegArrayBuffer: number[], fileName: string }>}
 */
async function convertHeic({ arrayBuffer, fileName, quality = 0.92 }) {
  // Reconstruct a Blob from the transferred array
  const blob = new Blob([new Uint8Array(arrayBuffer)], { type: "image/heic" });

  // heic2any is loaded globally via <script> in offscreen.html
  if (typeof heic2any === "undefined") {
    throw new Error("heic2any library not available in offscreen document");
  }

  const result = await heic2any({
    blob,
    toType: "image/jpeg",
    quality,
  });

  // heic2any may return an array for multi-frame HEIC — take first frame
  const outputBlob = Array.isArray(result) ? result[0] : result;

  // Convert back to transferable ArrayBuffer
  const ab = await outputBlob.arrayBuffer();
  const jpegArray = Array.from(new Uint8Array(ab));

  // Swap file extension
  const newName = fileName.replace(/\.(heic|heif)$/i, "") + ".jpg";

  return { success: true, jpegArrayBuffer: jpegArray, fileName: newName };
}
