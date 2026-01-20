"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Check, ZoomIn, ZoomOut, Move } from "lucide-react";
import {
  type CropArea,
  type CropResult,
  type AspectRatio,
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  cropImage,
} from "@/lib/image-cropper";

// ============================================================================
// Types
// ============================================================================

interface ImageCropperModalProps {
  /** The image file to crop */
  file: File;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when crop is completed */
  onCropComplete: (result: CropResult) => void;
  /** Target aspect ratio */
  aspectRatio?: AspectRatio;
  /** Modal title */
  title?: string;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.1;
const MAX_VIEWPORT_SIZE = 500;
const CONTAINER_PADDING = 48;

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to load an image from a File
 */
function useImageLoader(file: File | null, isOpen: boolean) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    if (!file || !isOpen) {
      setImage(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => console.error("Failed to load image");
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      setImage(null);
      setImageUrl("");
    };
  }, [file, isOpen]);

  return { image, imageUrl };
}

/**
 * Hook to track container size with ResizeObserver
 */
function useContainerSize(
  ref: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current || !isOpen) return;

    const element = ref.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    // Initial size
    updateSize();

    // Use ResizeObserver for efficient updates
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, isOpen]);

  return size;
}

/**
 * Hook to handle drag interactions
 */
function useDragInteraction(
  onDrag: (delta: Position) => void,
  isEnabled: boolean,
) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: 0, y: 0 });

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isEnabled) return;
      e.preventDefault();
      setIsDragging(true);

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragStartRef.current = { x: clientX, y: clientY };
    },
    [isEnabled],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const delta = {
        x: clientX - dragStartRef.current.x,
        y: clientY - dragStartRef.current.y,
      };

      positionRef.current = {
        x: positionRef.current.x + delta.x,
        y: positionRef.current.y + delta.y,
      };

      dragStartRef.current = { x: clientX, y: clientY };
      onDrag(delta);
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, onDrag]);

  return { isDragging, handleStart };
}

// ============================================================================
// Component
// ============================================================================

export function ImageCropperModal({
  file,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  title = "Crop Image",
}: ImageCropperModalProps) {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom hooks
  const { image } = useImageLoader(file, isOpen);
  const containerSize = useContainerSize(containerRef, isOpen);

  const targetRatio = ASPECT_RATIOS[aspectRatio];

  // Calculate viewport dimensions
  const viewport = useMemo((): Size => {
    if (containerSize.width === 0) return { width: 0, height: 0 };

    const maxWidth = containerSize.width - CONTAINER_PADDING;
    const maxHeight = containerSize.height - CONTAINER_PADDING;

    let width: number;
    let height: number;

    if (maxWidth / maxHeight > targetRatio) {
      height = Math.min(maxHeight, MAX_VIEWPORT_SIZE);
      width = height * targetRatio;
    } else {
      width = Math.min(maxWidth, MAX_VIEWPORT_SIZE);
      height = width / targetRatio;
    }

    return { width, height };
  }, [containerSize, targetRatio]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setScale(1);
    }
  }, [isOpen]);

  // Draw preview on canvas
  useEffect(() => {
    if (!canvasRef.current || !image || viewport.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;
    const drawX = (viewport.width - scaledWidth) / 2 + position.x;
    const drawY = (viewport.height - scaledHeight) / 2 + position.y;

    // Clear and fill background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // High-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw image
    ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
  }, [image, scale, position, viewport]);

  // Drag handler
  const handleDrag = useCallback((delta: Position) => {
    setPosition((prev) => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y,
    }));
  }, []);

  const { isDragging, handleStart } = useDragInteraction(handleDrag, !!image);

  // Zoom handlers
  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
    },
    [handleZoom],
  );

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, []);

  // Crop handler
  const handleCrop = useCallback(async () => {
    if (!image || viewport.width === 0) return;

    setIsProcessing(true);

    try {
      const scaledWidth = image.naturalWidth * scale;
      const scaledHeight = image.naturalHeight * scale;
      const drawX = (viewport.width - scaledWidth) / 2 + position.x;
      const drawY = (viewport.height - scaledHeight) / 2 + position.y;

      // Calculate crop area in original image coordinates
      let cropX = Math.max(0, Math.round(-drawX / scale));
      let cropY = Math.max(0, Math.round(-drawY / scale));
      let cropWidth = Math.round(viewport.width / scale);
      let cropHeight = Math.round(viewport.height / scale);

      // Clamp to image bounds
      cropX = Math.min(cropX, image.naturalWidth - cropWidth);
      cropY = Math.min(cropY, image.naturalHeight - cropHeight);
      cropWidth = Math.min(cropWidth, image.naturalWidth - cropX);
      cropHeight = Math.min(cropHeight, image.naturalHeight - cropY);

      const cropArea: CropArea = {
        x: Math.max(0, cropX),
        y: Math.max(0, cropY),
        width: Math.max(1, cropWidth),
        height: Math.max(1, cropHeight),
      };

      const result = await cropImage(file, cropArea, {
        maxSize: 1200,
        quality: 0.92,
      });

      onCropComplete(result);
      onClose();
    } catch (error) {
      console.error("Crop failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, image, scale, position, viewport, onCropComplete, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Portal to body for proper stacking
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-dark-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2
            id="crop-modal-title"
            className="text-lg font-semibold text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-dark-400" />
          </button>
        </header>

        {/* Crop Area */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center p-6 bg-dark-950 min-h-[400px]"
        >
          {image && viewport.width > 0 ? (
            <div
              className="relative overflow-hidden rounded-lg shadow-xl dynamic-size"
              style={
                {
                  "--width": `${viewport.width}px`,
                  "--height": `${viewport.height}px`,
                } as React.CSSProperties
              }
            >
              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="border border-white/20" />
                  ))}
                </div>
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white" />
              </div>

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                onWheel={handleWheel}
                className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} dynamic-size`}
                style={
                  {
                    "--width": `${viewport.width}px`,
                    "--height": `${viewport.height}px`,
                  } as React.CSSProperties
                }
                aria-label="Crop preview - drag to reposition, scroll to zoom"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-dark-400">
              <div className="h-5 w-5 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading image...</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <footer className="px-6 py-4 border-t border-dark-700 bg-dark-900">
          <div className="flex items-center justify-between gap-4">
            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoom(-ZOOM_STEP)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5 text-dark-400" />
              </button>

              <div
                className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(scale * 100)}
                aria-valuemin={Math.round(MIN_SCALE * 100)}
                aria-valuemax={Math.round(MAX_SCALE * 100)}
                aria-label={`Zoom level: ${Math.round(scale * 100)}%`}
              >
                <div
                  className="h-full bg-primary-500 transition-all duration-150 progress-bar-fill"
                  style={
                    {
                      "--progress": `${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%`,
                    } as React.CSSProperties
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => handleZoom(ZOOM_STEP)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5 text-dark-400" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors ml-2"
                aria-label="Reset position and zoom"
              >
                <RotateCcw className="h-5 w-5 text-dark-400" />
              </button>
            </div>

            {/* Instructions */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-dark-500">
              <Move className="h-4 w-4" />
              <span>Drag to reposition</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-dark-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCrop}
                disabled={isProcessing || !image}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Apply Crop
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default ImageCropperModal;
