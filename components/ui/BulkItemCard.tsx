"use client";

import { useState, useCallback, useId } from "react";
import type { BulkListingItem } from "@/types/bulk";
import type { UploadedImage } from "@/types";
import type { CropResult } from "@/lib/image-cropper";
import {
  X,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Upload,
  ArrowLeft,
  Sparkles,
  Crop,
  Loader2,
} from "lucide-react";
import { useImageCropper } from "@/lib/hooks/useImageCropper";
import { ImageCropperModal } from "./ImageCropperModal";
import { revokeImageUrl } from "@/lib/image-cropper";

// ============================================================================
// Types
// ============================================================================

interface BulkItemCardProps {
  /** The bulk listing item data */
  item: BulkListingItem;
  /** Callback when item is updated */
  onUpdate: (updates: Partial<BulkListingItem>) => void;
  /** Callback when item is removed */
  onRemove: () => void;
}

type UploadMode = "select" | "ai-generate" | "manual";

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGES_PER_ITEM = 6;

// ============================================================================
// Status Utilities
// ============================================================================

const STATUS_CONFIG = {
  ready: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    borderClass: "border-green-500 bg-green-50 dark:bg-green-900/10",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-500",
    borderClass: "border-red-500 bg-red-50 dark:bg-red-900/10",
  },
  pending: {
    icon: AlertCircle,
    iconClass: "text-yellow-500",
    borderClass: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10",
  },
} as const;

// ============================================================================
// Component
// ============================================================================

export function BulkItemCard({ item, onUpdate, onRemove }: BulkItemCardProps) {
  // Generate unique IDs for accessibility
  const titleInputId = useId();
  const priceInputId = useId();
  const fileInputId = useId();

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("select");
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null,
  );

  // Image cropper hook
  const { processFiles, isCropping } = useImageCropper({
    aspectRatio: "1:1",
    autoCrop: true,
    maxSize: 1200,
    quality: 0.92,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Handle image upload with auto-cropping
   */
  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (fileArray.length === 0) return;

      const processedImages = await processFiles(fileArray);

      if (processedImages.length > 0) {
        const allImages = [...(item.tempImages || []), ...processedImages];
        onUpdate({
          tempImages: allImages,
          images: allImages.map((img) => img.preview),
        });
      }
    },
    [item.tempImages, onUpdate, processFiles],
  );

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleImageUpload(e.dataTransfer.files);
    },
    [handleImageUpload],
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
   * Remove an image at index
   */
  const handleRemoveImage = useCallback(
    (index: number) => {
      const tempImage = item.tempImages?.[index];
      if (tempImage) {
        revokeImageUrl(tempImage.preview);
      }

      const newImages = item.images.filter((_, i) => i !== index);
      const newTempImages =
        item.tempImages?.filter((_, i) => i !== index) || [];

      onUpdate({
        images: newImages,
        tempImages: newTempImages,
      });
    },
    [item.images, item.tempImages, onUpdate],
  );

  /**
   * Open crop modal for an image
   */
  const handleEditCrop = useCallback((index: number) => {
    setEditingImageIndex(index);
  }, []);

  /**
   * Handle crop completion from modal
   */
  const handleCropComplete = useCallback(
    (result: CropResult) => {
      if (editingImageIndex === null || !item.tempImages) return;

      const oldImage = item.tempImages[editingImageIndex];
      if (oldImage) {
        revokeImageUrl(oldImage.preview);
      }

      const updatedTempImages = item.tempImages.map((img, i) =>
        i === editingImageIndex
          ? {
              ...img,
              file: result.croppedFile,
              preview: result.croppedUrl,
              compressed: true,
            }
          : img,
      );

      onUpdate({
        tempImages: updatedTempImages,
        images: updatedTempImages.map((img) => img.preview),
      });

      setEditingImageIndex(null);
    },
    [editingImageIndex, item.tempImages, onUpdate],
  );

  /**
   * Handle title change
   */
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ title: e.target.value });
    },
    [onUpdate],
  );

  /**
   * Handle price change
   */
  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ price: parseFloat(e.target.value) || 0 });
    },
    [onUpdate],
  );

  // ============================================================================
  // Computed values
  // ============================================================================

  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const canAddMoreImages =
    item.images.length < MAX_IMAGES_PER_ITEM && !isCropping;
  const showModeSelector = uploadMode === "select" && item.images.length === 0;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={`relative border-2 rounded-lg p-4 space-y-3 transition-all ${statusConfig.borderClass}`}
    >
      {/* Status Badge & Remove Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`h-5 w-5 ${statusConfig.iconClass}`}
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-dark-600 dark:text-dark-400 capitalize">
            {item.status}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
          aria-label="Remove item"
        >
          <X className="h-4 w-4 text-red-500" aria-hidden="true" />
        </button>
      </div>

      {/* Image Upload Section */}
      {showModeSelector ? (
        /* Upload Mode Selection */
        <div className="grid grid-cols-2 gap-2">
          {/* AI Generate Option */}
          <button
            type="button"
            onClick={() => setUploadMode("ai-generate")}
            className="group relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700 bg-gradient-to-br from-primary-50/50 to-purple-50/50 dark:from-primary-900/20 dark:to-purple-900/20 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all duration-200 min-h-[120px]"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200">
              <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <h3 className="text-xs font-bold text-dark-900 dark:text-dark-50 text-center">
              AI-Generated
            </h3>
            <p className="text-[10px] text-dark-500 dark:text-dark-400 text-center mt-0.5">
              Auto-enhance photos
            </p>
          </button>

          {/* Manual Upload Option */}
          <button
            type="button"
            onClick={() => setUploadMode("manual")}
            className="group flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-dark-300 dark:border-dark-600 bg-dark-50/50 dark:bg-dark-800/50 hover:border-dark-400 dark:hover:border-dark-500 hover:bg-dark-100/50 dark:hover:bg-dark-800 transition-all duration-200 min-h-[120px]"
          >
            <div className="h-10 w-10 rounded-xl bg-dark-200 dark:bg-dark-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200">
              <Upload
                className="h-5 w-5 text-dark-500 dark:text-dark-400"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-xs font-bold text-dark-900 dark:text-dark-50 text-center">
              Manual Upload
            </h3>
            <p className="text-[10px] text-dark-500 dark:text-dark-400 text-center mt-0.5">
              Use your own photos
            </p>
          </button>
        </div>
      ) : (
        /* Image Uploader */
        <div>
          {/* Mode indicator & back button */}
          {item.images.length === 0 && uploadMode !== "select" && (
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUploadMode("select")}
                aria-label="Go back to upload mode selection"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
              >
                <ArrowLeft
                  className="h-4 w-4 text-dark-500"
                  aria-hidden="true"
                />
              </button>
              <span className="text-[10px] font-medium text-dark-500 dark:text-dark-400 flex items-center gap-1">
                {uploadMode === "ai-generate" ? (
                  <>
                    <Sparkles
                      className="h-3 w-3 text-primary-500"
                      aria-hidden="true"
                    />
                    AI Mode
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3" aria-hidden="true" />
                    Manual
                  </>
                )}
              </span>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnter={handleDragOver}
            className={`
              relative border-2 border-dashed rounded-lg overflow-hidden transition-all duration-200
              ${
                isDragging
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                  : uploadMode === "ai-generate"
                    ? "border-primary-300 dark:border-primary-700"
                    : "border-dark-300 dark:border-dark-700"
              }
              ${isCropping ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            {/* Processing overlay */}
            {isCropping && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-dark-900/80">
                <div className="flex flex-col items-center gap-2">
                  <Loader2
                    className="h-6 w-6 text-primary-500 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-dark-600 dark:text-dark-400">
                    Cropping...
                  </span>
                </div>
              </div>
            )}

            {item.images.length > 0 ? (
              /* Image grid */
              <div className="grid grid-cols-3 gap-1 p-1">
                {item.images.map((image, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img
                      src={image}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                      loading="lazy"
                    />
                    {/* Action overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1">
                      {item.tempImages?.[index] && (
                        <button
                          type="button"
                          onClick={() => handleEditCrop(index)}
                          aria-label="Adjust crop"
                          className="p-1.5 bg-white/90 text-dark-900 rounded-full hover:bg-white transition-colors"
                        >
                          <Crop className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        aria-label="Remove image"
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                    {/* Cropped indicator */}
                    {item.tempImages?.[index]?.compressed && (
                      <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-green-500/90 text-white text-[8px] rounded flex items-center gap-0.5">
                        <Crop className="h-2 w-2" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add more images button */}
                {canAddMoreImages && (
                  <label className="aspect-square border-2 border-dashed border-dark-300 dark:border-dark-700 rounded flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      aria-label="Add more images"
                    />
                    <ImageIcon
                      className="h-6 w-6 text-dark-400"
                      aria-hidden="true"
                    />
                  </label>
                )}
              </div>
            ) : (
              /* Empty state upload area */
              <label
                className={`flex flex-col items-center justify-center p-6 cursor-pointer ${isCropping ? "pointer-events-none" : ""}`}
              >
                <input
                  type="file"
                  id={fileInputId}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={isCropping}
                />
                {uploadMode === "ai-generate" ? (
                  <>
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mb-2">
                      <Sparkles
                        className="h-4 w-4 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs text-dark-600 dark:text-dark-400 text-center">
                      Drop raw photos for AI processing
                    </p>
                  </>
                ) : (
                  <>
                    <ImageIcon
                      className="h-8 w-8 text-dark-400 mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-dark-600 dark:text-dark-400 text-center">
                      Drop images or click to upload
                    </p>
                    <p className="text-[10px] text-dark-500 dark:text-dark-500 text-center mt-1">
                      Auto-cropped to square
                    </p>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      )}

      {/* Title Input */}
      <div>
        <label htmlFor={titleInputId} className="sr-only">
          Product title
        </label>
        <input
          id={titleInputId}
          type="text"
          value={item.title}
          onChange={handleTitleChange}
          placeholder="Product title..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
        />
      </div>

      {/* Price Input */}
      <div className="relative">
        <label htmlFor={priceInputId} className="sr-only">
          Price
        </label>
        <DollarSign
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500"
          aria-hidden="true"
        />
        <input
          id={priceInputId}
          type="number"
          value={item.price || ""}
          onChange={handlePriceChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
        />
      </div>

      {/* Manual Crop Modal */}
      {editingImageIndex !== null && item.tempImages?.[editingImageIndex] && (
        <ImageCropperModal
          file={item.tempImages[editingImageIndex].file}
          isOpen={editingImageIndex !== null}
          onClose={() => setEditingImageIndex(null)}
          onCropComplete={handleCropComplete}
          aspectRatio="1:1"
          title="Adjust Crop"
        />
      )}
    </div>
  );
}

export default BulkItemCard;
