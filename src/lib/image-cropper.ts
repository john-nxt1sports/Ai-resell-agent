/**
 * Image Cropper Utility
 *
 * Professional-grade image processing for marketplace listings.
 * Provides auto-cropping, manual cropping, and image optimization.
 *
 * @module lib/image-cropper
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CropArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CropResult {
  readonly croppedFile: File;
  readonly croppedUrl: string;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly croppedWidth: number;
  readonly croppedHeight: number;
}

export interface CropOptions {
  readonly maxSize?: number;
  readonly quality?: number;
  readonly outputFormat?: OutputFormat;
}

export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

// ============================================================================
// Constants
// ============================================================================

export const ASPECT_RATIOS: Readonly<Record<AspectRatio, number>> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
} as const;

/** Default aspect ratio for marketplace listings (square) */
export const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";

/** Maximum output dimension in pixels */
export const DEFAULT_MAX_SIZE = 1200;

/** JPEG compression quality (0-1) */
export const DEFAULT_QUALITY = 0.92;

/** Default output format */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "image/jpeg";

// ============================================================================
// Pure Utility Functions
// ============================================================================

/**
 * Calculate the optimal center-crop area for a target aspect ratio.
 * This is a pure function with no side effects.
 */
export function calculateCenterCropArea(
  imageWidth: number,
  imageHeight: number,
  targetAspectRatio: number,
): CropArea {
  const imageAspectRatio = imageWidth / imageHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (imageAspectRatio > targetAspectRatio) {
    // Image is wider than target - crop the width
    cropHeight = imageHeight;
    cropWidth = cropHeight * targetAspectRatio;
  } else {
    // Image is taller than target - crop the height
    cropWidth = imageWidth;
    cropHeight = cropWidth / targetAspectRatio;
  }

  return {
    x: Math.round((imageWidth - cropWidth) / 2),
    y: Math.round((imageHeight - cropHeight) / 2),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Calculate output dimensions while maintaining aspect ratio and respecting max size.
 */
function calculateOutputDimensions(
  width: number,
  height: number,
  maxSize: number,
): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }

  const scale = maxSize / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Generate a filename with the new extension.
 */
function generateFileName(originalName: string, format: OutputFormat): string {
  const extension = format.split("/")[1];
  return originalName.replace(/\.[^.]+$/, `.${extension}`);
}

// ============================================================================
// Image Loading
// ============================================================================

/**
 * Load an image from a File object.
 * Handles cleanup of object URLs on both success and failure.
 */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Load an image and get its dimensions, cleaning up resources afterward.
 */
export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  const dimensions = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
  URL.revokeObjectURL(img.src);
  return dimensions;
}

// ============================================================================
// Core Cropping Functions
// ============================================================================

/**
 * Crop an image using canvas with the specified crop area.
 *
 * @param file - The source image file
 * @param cropArea - The area to crop from the original image
 * @param options - Optional configuration for output size, quality, and format
 * @returns Promise resolving to the crop result with file and metadata
 */
export async function cropImage(
  file: File,
  cropArea: CropArea,
  options: CropOptions = {},
): Promise<CropResult> {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    outputFormat = DEFAULT_OUTPUT_FORMAT,
  } = options;

  const img = await loadImage(file);
  const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img;

  // Calculate final output dimensions
  const { width: outputWidth, height: outputHeight } =
    calculateOutputDimensions(cropArea.width, cropArea.height, maxSize);

  // Create and configure canvas
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(img.src);
    throw new Error("Failed to get canvas 2D context");
  }

  // Configure high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the cropped portion
  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  // Clean up source image URL
  URL.revokeObjectURL(img.src);

  // Convert to blob and create result
  return new Promise<CropResult>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }

        const fileName = generateFileName(file.name, outputFormat);
        const croppedFile = new File([blob], fileName, { type: outputFormat });
        const croppedUrl = URL.createObjectURL(croppedFile);

        resolve({
          croppedFile,
          croppedUrl,
          originalWidth,
          originalHeight,
          croppedWidth: outputWidth,
          croppedHeight: outputHeight,
        });
      },
      outputFormat,
      quality,
    );
  });
}

/**
 * Auto-crop an image to the target aspect ratio using center crop.
 *
 * @param file - The source image file
 * @param aspectRatio - Target aspect ratio (default: 1:1 square)
 * @param options - Optional configuration for output
 * @returns Promise resolving to the crop result
 */
export async function autoCropImage(
  file: File,
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO,
  options: CropOptions = {},
): Promise<CropResult> {
  const img = await loadImage(file);

  const cropArea = calculateCenterCropArea(
    img.naturalWidth,
    img.naturalHeight,
    ASPECT_RATIOS[aspectRatio],
  );

  // Clean up the temporary URL before cropping
  URL.revokeObjectURL(img.src);

  return cropImage(file, cropArea, options);
}

/**
 * Process multiple images with auto-crop in parallel.
 * Uses Promise.allSettled for graceful handling of individual failures.
 *
 * @param files - Array of image files to process
 * @param aspectRatio - Target aspect ratio
 * @param options - Crop options
 * @returns Array of successful crop results
 */
export async function autoCropImages(
  files: File[],
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO,
  options: CropOptions = {},
): Promise<CropResult[]> {
  const results = await Promise.allSettled(
    files.map((file) => autoCropImage(file, aspectRatio, options)),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<CropResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}

/**
 * Check if an image needs cropping for a target aspect ratio.
 *
 * @param file - The image file to check
 * @param aspectRatio - Target aspect ratio
 * @param tolerance - Acceptable ratio difference (default: 1%)
 * @returns True if the image aspect ratio differs from target beyond tolerance
 */
export async function needsCropping(
  file: File,
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO,
  tolerance: number = 0.01,
): Promise<boolean> {
  const { width, height } = await getImageDimensions(file);
  const currentRatio = width / height;
  const targetRatio = ASPECT_RATIOS[aspectRatio];
  return Math.abs(currentRatio - targetRatio) > tolerance;
}

/**
 * Revoke an object URL safely, handling null/undefined values.
 */
export function revokeImageUrl(url: string | null | undefined): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
