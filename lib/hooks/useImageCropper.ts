"use client";

import { useState, useCallback, useRef } from "react";
import {
  autoCropImage,
  type CropResult,
  type AspectRatio,
  type CropOptions,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_MAX_SIZE,
  DEFAULT_QUALITY,
  revokeImageUrl,
} from "@/lib/image-cropper";
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

/** Check if a file is an image */
const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/");
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

  const [isCropping, setIsCropping] = useState(false);
  const [cropProgress, setCropProgress] = useState(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Store options in ref to avoid stale closures
  const optionsRef = useRef<CropOptions>({ maxSize, quality });
  optionsRef.current = { maxSize, quality };

  /**
   * Process a single file and return an UploadedImage
   */
  const processFile = useCallback(
    async (file: File): Promise<UploadedImage> => {
      if (autoCrop) {
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

      // No auto-crop - just create preview
      const preview = URL.createObjectURL(file);
      return {
        id: generateId(),
        file,
        preview,
        compressed: false,
      };
    },
    [aspectRatio, autoCrop],
  );

  /**
   * Process multiple files with progress tracking
   */
  const processFiles = useCallback(
    async (files: File[]): Promise<UploadedImage[]> => {
      // Filter to only image files
      const imageFiles = files.filter(isImageFile);

      if (imageFiles.length === 0) {
        return [];
      }

      // Update state
      setIsCropping(true);
      setCropProgress(0);
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

            // Fallback: use original file without cropping
            const preview = URL.createObjectURL(imageFiles[i]);
            processedImages.push({
              id: generateId(),
              file: imageFiles[i],
              preview,
              compressed: false,
            });
          }

          // Update progress
          if (isMountedRef.current) {
            setCropProgress(Math.round(((i + 1) / imageFiles.length) * 100));
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
          setIsCropping(false);
          setCropProgress(0);
        }
      }
    },
    [processFile, onProcessingStart, onProcessingComplete, onError],
  );

  /**
   * Reset the cropper state
   */
  const reset = useCallback(() => {
    setIsCropping(false);
    setCropProgress(0);
  }, []);

  return {
    isCropping,
    cropProgress,
    processFiles,
    reset,
  };
}

export default useImageCropper;
