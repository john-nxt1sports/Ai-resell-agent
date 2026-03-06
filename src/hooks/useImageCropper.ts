"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  autoCropImage,
  type AspectRatio,
  type CropOptions,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_MAX_SIZE,
  DEFAULT_QUALITY,
} from "@/lib/image-cropper";
import { isHeicFile } from "@/lib/heic-converter";
import type { UploadedImage } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface UseImageCropperOptions {
  /** Target aspect ratio for cropping */
  aspectRatio?: AspectRatio;
  /** Enable automatic cropping on upload */
  autoCrop?: boolean;
  /** Maximum output dimension in pixels */
  maxSize?: number;
  /** JPEG quality (0-1) */
  quality?: number;
  /** Callback when processing starts */
  onProcessingStart?: () => void;
  /** Callback when processing completes */
  onProcessingComplete?: (images: UploadedImage[]) => void;
  /** Callback on processing error */
  onError?: (error: Error) => void;
}

export interface UseImageCropperReturn {
  /** Whether images are currently being processed */
  isCropping: boolean;
  /** Progress percentage (0-100) */
  cropProgress: number;
  /** Process an array of files with auto-crop */
  processFiles: (files: File[]) => Promise<UploadedImage[]>;
  /** Reset the cropper state */
  reset: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/** Generate a unique ID for uploaded images */
const generateId = (): string => {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

/** Check if a file is an image (including HEIC/HEIF with missing MIME type) */
const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/") || isHeicFile(file);
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to manage image cropping workflow.
 * Provides automatic batch processing with progress tracking.
 *
 * @example
 * ```tsx
 * const { processFiles, isCropping, cropProgress } = useImageCropper({
 *   aspectRatio: '1:1',
 *   autoCrop: true,
 * });
 *
 * const handleUpload = async (files: FileList) => {
 *   const images = await processFiles(Array.from(files));
 *   setImages(prev => [...prev, ...images]);
 * };
 * ```
 */
export function useImageCropper(
  options: UseImageCropperOptions = {},
): UseImageCropperReturn {
  const {
    aspectRatio = DEFAULT_ASPECT_RATIO,
    autoCrop = true,
    maxSize = DEFAULT_MAX_SIZE,
    quality = DEFAULT_QUALITY,
    onProcessingStart,
    onProcessingComplete,
    onError,
  } = options;

  const [activeBatches, setActiveBatches] = useState(0);
  const [cropProgress, setCropProgress] = useState(0);

  // Derived: cropping if any batch is active
  const isCropping = activeBatches > 0;

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track total progress across concurrent batches
  const progressRef = useRef({ completed: 0, total: 0 });

  // Store options in ref to avoid stale closures
  const optionsRef = useRef<CropOptions>({ maxSize, quality });
  optionsRef.current = { maxSize, quality };

  /**
   * Process a single file and return an UploadedImage.
   * HEIC/HEIF conversion is handled internally by loadImage() in image-cropper,
   * so we don't convert here to avoid double processing.
   */
  const processFile = useCallback(
    async (file: File): Promise<UploadedImage> => {
      if (autoCrop) {
        // autoCropImage → loadImage handles HEIC conversion internally
        const result = await autoCropImage(
          file,
          aspectRatio,
          optionsRef.current,
        );
        return {
          id: generateId(),
          file: result.croppedFile,
          preview: result.croppedUrl,
          compressed: true,
        };
      }

      // No auto-crop — convert HEIC if needed, then create preview
      let processedFile = file;
      if (isHeicFile(file)) {
        const { convertHeicIfNeeded } = await import("@/lib/heic-converter");
        const conversionResult = await convertHeicIfNeeded(file);
        processedFile = conversionResult.file;
      }

      const preview = URL.createObjectURL(processedFile);
      return {
        id: generateId(),
        file: processedFile,
        preview,
        compressed: false,
      };
    },
    [aspectRatio, autoCrop],
  );

  /**
   * Process multiple files with progress tracking.
   * Supports concurrent batches — dropping more files while processing
   * adds them to the progress tracker without blocking.
   */
  const processFiles = useCallback(
    async (files: File[]): Promise<UploadedImage[]> => {
      // Filter to only image files (including HEIC)
      const imageFiles = files.filter(isImageFile);

      if (imageFiles.length === 0) {
        return [];
      }

      // Register this batch
      setActiveBatches((prev) => prev + 1);
      progressRef.current.total += imageFiles.length;
      onProcessingStart?.();

      const processedImages: UploadedImage[] = [];

      try {
        for (let i = 0; i < imageFiles.length; i++) {
          // Check if still mounted before processing
          if (!isMountedRef.current) break;

          try {
            const image = await processFile(imageFiles[i]);
            processedImages.push(image);
          } catch (error) {
            // Log error but continue processing other files
            console.error(
              `Failed to process image ${imageFiles[i].name}:`,
              error,
            );

            // Fallback: use file without cropping (skip re-attempting HEIC conversion if it already failed)
            try {
              const preview = URL.createObjectURL(imageFiles[i]);
              processedImages.push({
                id: generateId(),
                file: imageFiles[i],
                preview,
                compressed: false,
              });
            } catch {
              // If even creating an objectURL fails, skip this file entirely
              console.error(
                `Skipping unprocessable file: ${imageFiles[i].name}`,
              );
            }
          }

          // Update global progress across all concurrent batches
          if (isMountedRef.current) {
            progressRef.current.completed += 1;
            const { completed, total } = progressRef.current;
            setCropProgress(Math.round((completed / total) * 100));
          }
        }

        onProcessingComplete?.(processedImages);
        return processedImages;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Processing failed");
        onError?.(err);
        throw err;
      } finally {
        if (isMountedRef.current) {
          setActiveBatches((prev) => {
            const next = prev - 1;
            // Reset progress when all batches complete
            if (next === 0) {
              progressRef.current = { completed: 0, total: 0 };
              setCropProgress(0);
            }
            return next;
          });
        }
      }
    },
    [processFile, onProcessingStart, onProcessingComplete, onError],
  );

  /**
   * Reset the cropper state
   */
  const reset = useCallback(() => {
    setActiveBatches(0);
    setCropProgress(0);
    progressRef.current = { completed: 0, total: 0 };
  }, []);

  return {
    isCropping,
    cropProgress,
    processFiles,
    reset,
  };
}

export default useImageCropper;
