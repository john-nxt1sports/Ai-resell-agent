"use client";

import { useCallback, useState, useId } from "react";
import { Upload, X, Image as ImageIcon, Crop, Loader2 } from "lucide-react";
import type { UploadedImage } from "@/types";
import type { AspectRatio, CropResult } from "@/lib/image-cropper";
import { useImageCropper } from "@/lib/hooks/useImageCropper";
import { ImageCropperModal } from "./ImageCropperModal";
import { revokeImageUrl } from "@/lib/image-cropper";

// ============================================================================
// Types
// ============================================================================

interface FileUploaderProps {
  /** Current array of uploaded images */
  images: UploadedImage[];
  /** Callback when images change */
  onImagesChange: (images: UploadedImage[]) => void;
  /** Target aspect ratio for auto-crop */
  aspectRatio?: AspectRatio;
  /** Enable manual crop adjustment */
  enableManualCrop?: boolean;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Accepted file types */
  accept?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_IMAGES = 10;
const DEFAULT_ACCEPT = "image/*";

// ============================================================================
// Component
// ============================================================================

export function FileUploader({
  images,
  onImagesChange,
  aspectRatio = "1:1",
  enableManualCrop = true,
  maxImages = DEFAULT_MAX_IMAGES,
  accept = DEFAULT_ACCEPT,
}: FileUploaderProps) {
  // Generate unique ID for accessibility
  const inputId = useId();

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [editingImage, setEditingImage] = useState<UploadedImage | null>(null);

  // Image cropper hook
  const { processFiles, isCropping, cropProgress } = useImageCropper({
    aspectRatio,
    autoCrop: true,
    maxSize: 1200,
    quality: 0.92,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Process uploaded files and add to images array
   */
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Check remaining capacity
      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) return;

      // Convert to array and limit to remaining slots
      const fileArray = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .slice(0, remainingSlots);

      if (fileArray.length === 0) return;

      const processedImages = await processFiles(fileArray);

      if (processedImages.length > 0) {
        onImagesChange([...images, ...processedImages]);
      }
    },
    [images, maxImages, onImagesChange, processFiles],
  );

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Remove an image from the array
   */
  const removeImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id);
      if (image) {
        revokeImageUrl(image.preview);
      }
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange],
  );

  /**
   * Open manual crop modal
   */
  const handleEditCrop = useCallback((image: UploadedImage) => {
    setEditingImage(image);
  }, []);

  /**
   * Handle crop completion from modal
   */
  const handleCropComplete = useCallback(
    (result: CropResult) => {
      if (!editingImage) return;

      // Revoke old preview URL
      revokeImageUrl(editingImage.preview);

      // Update images with new cropped version
      const updatedImages = images.map((img) =>
        img.id === editingImage.id
          ? {
              ...img,
              file: result.croppedFile,
              preview: result.croppedUrl,
              compressed: true,
            }
          : img,
      );

      onImagesChange(updatedImages);
      setEditingImage(null);
    },
    [editingImage, images, onImagesChange],
  );

  // ============================================================================
  // Computed values
  // ============================================================================

  const canAddMore = images.length < maxImages && !isCropping;
  const isDisabled = isCropping;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Processing Indicator */}
      {isCropping && (
        <div
          className="flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-5 w-5 text-primary-500 animate-spin"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
              Auto-cropping images...
            </p>
            <div
              className="mt-1 h-1.5 bg-primary-200 dark:bg-primary-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-label={`Processing progress: ${Math.round(cropProgress)}%`}
              aria-valuenow={Math.round(cropProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary-500 transition-all duration-300 ease-out progress-bar-fill"
                style={
                  { "--progress": `${cropProgress}%` } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragOver}
        className={`
          relative border-2 rounded-lg p-8 transition-all duration-200
          ${
            isDragging
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10 scale-[1.01]"
              : "border-dark-300 dark:border-dark-700"
          }
          ${isDisabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          type="file"
          id={inputId}
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isDisabled}
          aria-describedby={`${inputId}-description`}
        />

        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload
            className={`h-12 w-12 mb-4 transition-colors ${
              isDragging ? "text-primary-500" : "text-dark-400"
            }`}
            aria-hidden="true"
          />
          <p className="text-lg font-medium text-dark-900 dark:text-dark-50 mb-2">
            Drop images here or click to upload
          </p>
          <p
            id={`${inputId}-description`}
            className="text-sm text-dark-600 dark:text-dark-400"
          >
            Supports: JPG, PNG, WEBP (max {maxImages} images) • Auto-cropped to
            square
          </p>
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          role="list"
          aria-label="Uploaded images"
        >
          {images.map((image) => (
            <div
              key={image.id}
              role="listitem"
              className="relative group aspect-square rounded-lg overflow-hidden border border-dark-200 dark:border-dark-800 bg-dark-100 dark:bg-dark-800"
            >
              <img
                src={image.preview}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                {enableManualCrop && (
                  <button
                    type="button"
                    onClick={() => handleEditCrop(image)}
                    className="p-2 bg-white/90 text-dark-900 rounded-full hover:bg-white transition-colors"
                    aria-label="Adjust crop"
                  >
                    <Crop className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Cropped Badge */}
              {image.compressed && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/90 text-white text-xs rounded flex items-center gap-1">
                  <Crop className="h-3 w-3" aria-hidden="true" />
                  <span>Cropped</span>
                </div>
              )}
            </div>
          ))}

          {/* Add More Button */}
          {canAddMore && (
            <label
              htmlFor={inputId}
              className="aspect-square rounded-lg border-2 border-dark-300 dark:border-dark-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-200"
            >
              <ImageIcon
                className="h-8 w-8 text-dark-400 mb-2"
                aria-hidden="true"
              />
              <span className="text-sm text-dark-600 dark:text-dark-400">
                Add more
              </span>
            </label>
          )}
        </div>
      )}

      {/* Manual Crop Modal */}
      {editingImage && (
        <ImageCropperModal
          file={editingImage.file}
          isOpen={!!editingImage}
          onClose={() => setEditingImage(null)}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
          title="Adjust Crop"
        />
      )}
    </div>
  );
}

export default FileUploader;
