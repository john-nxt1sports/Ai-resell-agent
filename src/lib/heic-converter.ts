/**
 * HEIC Image Converter
 *
 * Seamless HEIC/HEIF to JPEG conversion for iOS image compatibility.
 * Lazy-loads the heic2any library only when a HEIC file is detected,
 * keeping it out of the main bundle (~400KB savings).
 *
 * @module lib/heic-converter
 * @since 2026
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ConversionResult {
  readonly file: File;
  readonly wasConverted: boolean;
  readonly originalFormat?: string;
  readonly conversionTimeMs?: number;
}

export interface ConversionOptions {
  /** Output quality (0-1). Default: 0.92 */
  readonly quality?: number;
  /** Output format. Default: "image/jpeg" */
  readonly outputFormat?: "image/jpeg" | "image/png" | "image/webp";
  /** Preserve original filename with new extension. Default: true */
  readonly preserveFileName?: boolean;
}

export type HeicMimeType = (typeof HEIC_MIME_TYPES)[number];
export type HeicExtension = (typeof HEIC_EXTENSIONS)[number];

// ============================================================================
// Constants
// ============================================================================

/** HEIC/HEIF MIME types that need conversion */
export const HEIC_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

/** File extensions that indicate HEIC format */
export const HEIC_EXTENSIONS = [".heic", ".heif"] as const;

/** Default conversion settings optimized for quality & speed */
const DEFAULT_OPTIONS = {
  quality: 0.92,
  outputFormat: "image/jpeg",
  preserveFileName: true,
} as const satisfies Required<ConversionOptions>;

/** Extension mapping for output formats */
const EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const satisfies Record<
  NonNullable<ConversionOptions["outputFormat"]>,
  string
>;

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if a file is in HEIC/HEIF format.
 * Uses both MIME type and file extension for robust detection
 * (iOS sometimes sends HEIC files with empty or generic MIME types).
 *
 * @param file - The file to check
 * @returns `true` if the file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const mimeType = file.type.toLowerCase();

  // Check MIME type first (most reliable when present)
  if (mimeType && HEIC_MIME_TYPES.includes(mimeType as HeicMimeType)) {
    return true;
  }

  // Fall back to extension check (handles iOS quirks with empty MIME types)
  const fileName = file.name.toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Get the output file extension based on format.
 */
function getExtension(format: keyof typeof EXTENSION_MAP): string {
  return EXTENSION_MAP[format];
}

/**
 * Generate converted filename preserving original name.
 */
function generateConvertedFileName(
  originalName: string,
  outputFormat: keyof typeof EXTENSION_MAP,
): string {
  const extension = getExtension(outputFormat);
  // Remove HEIC/HEIF extension and add new one
  return originalName.replace(/\.(heic|heif)$/i, "") + extension;
}

// ============================================================================
// Core Conversion Function
// ============================================================================

/**
 * Convert a HEIC/HEIF image to JPEG/PNG/WebP.
 * Returns the original file unchanged if it's not HEIC format.
 *
 * @param file - The file to convert
 * @param options - Conversion options
 * @returns Conversion result with the processed file
 *
 * @example
 * ```ts
 * const result = await convertHeicIfNeeded(file);
 * if (result.wasConverted) {
 *   console.log(`Converted from ${result.originalFormat} in ${result.conversionTimeMs}ms`);
 * }
 * // Use result.file for further processing
 * ```
 */
export async function convertHeicIfNeeded(
  file: File,
  options: ConversionOptions = {},
): Promise<ConversionResult> {
  // Early return if not HEIC - no conversion needed
  if (!isHeicFile(file)) {
    return { file, wasConverted: false };
  }

  const startTime = performance.now();
  const { quality, outputFormat, preserveFileName } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  try {
    // Lazy-load heic2any to avoid bundling ~400KB on pages that never handle HEIC
    const { default: heic2any } = await import("heic2any");

    const convertedBlob = await heic2any({
      blob: file,
      toType: outputFormat,
      quality,
    });

    // heic2any returns an array for multi-image HEIC sequences — use first frame
    let outputBlob: Blob;
    if (Array.isArray(convertedBlob)) {
      if (convertedBlob.length > 1) {
        console.warn(
          `[HEIC Converter] Multi-frame HEIC detected (${convertedBlob.length} frames). Using first frame only.`,
        );
      }
      outputBlob = convertedBlob[0];
    } else {
      outputBlob = convertedBlob;
    }

    // Generate filename
    const newFileName = preserveFileName
      ? generateConvertedFileName(file.name, outputFormat)
      : `converted_${Date.now()}${getExtension(outputFormat)}`;

    // Create File object with proper metadata
    const convertedFile = new File([outputBlob], newFileName, {
      type: outputFormat,
      lastModified: Date.now(),
    });

    const conversionTimeMs = Math.round(performance.now() - startTime);

    return {
      file: convertedFile,
      wasConverted: true,
      originalFormat: file.type || "image/heic",
      conversionTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[HEIC Converter] Conversion failed:", {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)}KB`,
      fileType: file.type || "(empty)",
      error: errorMessage,
    });

    throw new HeicConversionError(
      `Failed to convert HEIC image "${file.name}": ${errorMessage}`,
      file,
      { cause: error },
    );
  }
}

// ============================================================================
// Batch Conversion
// ============================================================================

/**
 * Result from batch conversion including any errors that occurred.
 */
export interface BatchConversionResult {
  /** Successfully converted/passed-through files */
  readonly results: ConversionResult[];
  /** Files that failed to convert (with error details) */
  readonly errors: Array<{ file: File; error: Error }>;
  /** Total processing time in milliseconds */
  readonly totalTimeMs: number;
}

/**
 * Convert multiple HEIC files in parallel with concurrency control.
 * Uses Promise.allSettled for resilient batch processing - failed
 * conversions don't block successful ones.
 *
 * @param files - Array of files to process
 * @param options - Conversion options
 * @param concurrency - Max parallel conversions (default: 3)
 * @returns Batch result with successes, failures, and timing
 */
export async function convertHeicBatch(
  files: File[],
  options: ConversionOptions = {},
  concurrency = 3,
): Promise<BatchConversionResult> {
  const startTime = performance.now();
  const results: ConversionResult[] = [];
  const errors: Array<{ file: File; error: Error }> = [];
  const queue = [...files];

  // Process in batches for controlled concurrency & memory usage
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);

    const batchSettled = await Promise.allSettled(
      batch.map((file) => convertHeicIfNeeded(file, options)),
    );

    // Separate successes and failures
    batchSettled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({
          file: batch[index],
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        });
      }
    });
  }

  return {
    results,
    errors,
    totalTimeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Prepare files for upload by converting HEIC if needed.
 * This is the main entry point for image upload flows.
 * Silently skips failed conversions (logs errors but doesn't throw).
 *
 * @param files - Files from input or drag-drop
 * @param options - Conversion options
 * @returns Array of upload-ready files (HEIC converted to JPEG)
 */
export async function prepareFilesForUpload(
  files: File[],
  options: ConversionOptions = {},
): Promise<File[]> {
  const { results, errors, totalTimeMs } = await convertHeicBatch(
    files,
    options,
  );

  if (errors.length > 0) {
    console.warn(
      `[HEIC Converter] ${errors.length} file(s) failed to convert:`,
      errors.map((e) => e.file.name),
    );
  }

  if (results.length > 0) {
    const converted = results.filter((r) => r.wasConverted).length;
    if (converted > 0) {
      console.log(
        `[HEIC Converter] Processed ${results.length} files (${converted} converted) in ${totalTimeMs}ms`,
      );
    }
  }

  return results.map((r) => r.file);
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error for HEIC conversion failures.
 * Includes original file reference for debugging and retry logic.
 */
export class HeicConversionError extends Error {
  override readonly name = "HeicConversionError";
  readonly code = "HEIC_CONVERSION_ERROR" as const;

  constructor(
    message: string,
    public readonly originalFile: File,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
