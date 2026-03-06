/**
 * Shared HEIC/HEIF Detection & Conversion Utilities
 *
 * Mirrors the detection logic in src/lib/heic-converter.ts so the Chrome
 * extension popup and the Next.js web app use identical rules.
 *
 * Conversion is delegated to the background service-worker which spins up
 * an offscreen document — the popup's CSP blocks the Web Workers that
 * heic2any requires.
 *
 * @version 2.0.0
 */

"use strict";

// ============================================================================
// Constants — kept in sync with src/lib/heic-converter.ts
// ============================================================================

const HEIC_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

const HEIC_EXTENSIONS = [".heic", ".heif"];

const HEIC_DEFAULTS = Object.freeze({
  quality: 0.92,
  outputFormat: "image/jpeg",
});

const MESSAGE_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]);
}

// ============================================================================
// Detection
// ============================================================================

/**
 * Check if a file is HEIC/HEIF.
 * Uses both MIME type and extension (iOS sometimes sends empty MIME types).
 *
 * @param {File} file
 * @returns {boolean}
 */
function isHeicFile(file) {
  const mime = (file.type || "").toLowerCase();
  if (mime && HEIC_MIME_TYPES.includes(mime)) return true;
  const name = (file.name || "").toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => name.endsWith(ext));
}

// ============================================================================
// Conversion (via background → offscreen document)
// ============================================================================

/**
 * Convert a HEIC/HEIF file to JPEG.  Returns the original file unchanged
 * if it's not HEIC format.
 *
 * The actual conversion runs in an offscreen document that has a relaxed
 * CSP (allowing the Web Workers heic2any needs).  We send the file bytes
 * to the background service-worker, which forwards them there.
 *
 * @param {File} file - The file to convert
 * @param {object} [opts]
 * @param {number} [opts.quality=0.92]  - JPEG quality 0-1
 * @returns {Promise<{ file: File, wasConverted: boolean }>}
 */
async function convertHeicIfNeeded(file, opts = {}) {
  if (!isHeicFile(file)) {
    return { file, wasConverted: false };
  }

  const quality = opts.quality ?? HEIC_DEFAULTS.quality;

  // Read file into an ArrayBuffer, then convert to a plain Array so it
  // survives Chrome's structured-clone message serialisation.
  const buffer = await file.arrayBuffer();
  const byteArray = Array.from(new Uint8Array(buffer));

  const response = await withTimeout(
    chrome.runtime.sendMessage({
      type: "CONVERT_HEIC",
      arrayBuffer: byteArray,
      fileName: file.name,
      quality,
    }),
    MESSAGE_TIMEOUT_MS,
    "HEIC conversion",
  );

  if (!response || typeof response !== "object") {
    throw new Error("HEIC conversion returned no response");
  }

  if (!response.success) {
    throw new Error(response?.error || "HEIC conversion failed");
  }

  if (!Array.isArray(response.jpegArrayBuffer) || !response.fileName) {
    throw new Error("HEIC conversion returned invalid payload");
  }

  // Reconstruct a File from the returned JPEG bytes
  const jpegBytes = new Uint8Array(response.jpegArrayBuffer);
  const convertedFile = new File([jpegBytes], response.fileName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return { file: convertedFile, wasConverted: true };
}

// Expose globally so popup.js (and any other extension script) can use them
window.heicUtils = Object.freeze({
  isHeicFile,
  convertHeicIfNeeded,
  HEIC_MIME_TYPES,
  HEIC_EXTENSIONS,
  HEIC_DEFAULTS,
});
