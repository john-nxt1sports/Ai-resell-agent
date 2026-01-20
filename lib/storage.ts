/**
 * Supabase Storage Service
 * Handles image uploads to Supabase Storage with production-ready features:
 * - File validation (type, size)
 * - Image optimization
 * - Error handling
 * - Progress tracking
 * - Retry logic
 */

import { createClient } from "./supabase/client";
import imageCompression from "browser-image-compression";

const BUCKET_NAME = "listing-images";

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "compressing" | "uploading" | "completed" | "error";
  error?: string;
}

export class StorageError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Validate file before upload
 */
function validateFile(file: File): void {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(
      `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_TYPES.join(
        ", "
      )}`,
      "INVALID_FILE_TYPE",
      { fileType: file.type, fileName: file.name }
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`,
      "FILE_TOO_LARGE",
      { fileSize: file.size, maxSize: MAX_FILE_SIZE, fileName: file.name }
    );
  }

  // Check file name
  if (!file.name || file.name.length > 255) {
    throw new StorageError("Invalid file name", "INVALID_FILE_NAME", {
      fileName: file.name,
    });
  }
}

/**
 * Compress and optimize image before upload
 */
async function compressImage(file: File): Promise<File> {
  try {
    // Skip compression for already small files or GIFs
    if (file.size < 500 * 1024 || file.type === "image/gif") {
      return file;
    }

    const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);

    console.log(`Image compressed: ${file.name}`);
    console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB`);
    console.log(
      `Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`
    );
    console.log(
      `Reduction: ${(
        ((file.size - compressedFile.size) / file.size) *
        100
      ).toFixed(2)}%`
    );

    return compressedFile;
  } catch (error) {
    console.error("Compression error, using original file:", error);
    return file; // Fallback to original if compression fails
  }
}

/**
 * Generate a unique, SEO-friendly filename
 */
function generateFileName(file: File, userId: string): string {
  // Clean the original filename
  const cleanName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  const fileExt = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);

  return `${userId}/${timestamp}-${randomId}-${cleanName}`;
}

/**
 * Upload a single image to Supabase Storage with retry logic
 */
export async function uploadImage(
  file: File,
  userId: string,
  options?: {
    onProgress?: (progress: UploadProgress) => void;
    compress?: boolean;
    retries?: number;
  }
): Promise<UploadResult> {
  const { onProgress, compress = true, retries = 3 } = options || {};

  try {
    // Validate file
    validateFile(file);

    // Report compression start
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: "compressing",
    });

    // Compress image if enabled
    const fileToUpload = compress ? await compressImage(file) : file;

    // Report upload start
    onProgress?.({
      fileName: file.name,
      progress: 30,
      status: "uploading",
    });

    const supabase = createClient();
    const fileName = generateFileName(file, userId);

    // Attempt upload with retry logic
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, fileToUpload, {
            cacheControl: "31536000", // 1 year cache
            upsert: false,
            contentType: fileToUpload.type,
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

        // Report completion
        onProgress?.({
          fileName: file.name,
          progress: 100,
          status: "completed",
        });

        return {
          url: publicUrl,
          path: data.path,
          size: fileToUpload.size,
          type: fileToUpload.type,
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Upload attempt ${attempt + 1} failed:`, error);

        // Don't retry on validation errors
        if (error.statusCode === 400 || error.statusCode === 413) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // All retries failed
    throw new StorageError(
      `Failed to upload image after ${retries} attempts: ${
        lastError?.message || "Unknown error"
      }`,
      "UPLOAD_FAILED",
      { fileName: file.name, originalError: lastError }
    );
  } catch (error: any) {
    onProgress?.({
      fileName: file.name,
      progress: 0,
      status: "error",
      error: error.message,
    });

    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to upload image: ${error.message}`,
      "UPLOAD_ERROR",
      { fileName: file.name, originalError: error }
    );
  }
}

/**
 * Upload multiple images to Supabase Storage with progress tracking
 */
export async function uploadImages(
  files: File[],
  userId: string,
  options?: {
    onProgress?: (progress: UploadProgress) => void;
    onOverallProgress?: (completed: number, total: number) => void;
    compress?: boolean;
    parallel?: boolean;
  }
): Promise<UploadResult[]> {
  const {
    onProgress,
    onOverallProgress,
    compress = true,
    parallel = true,
  } = options || {};

  if (!files || files.length === 0) {
    throw new StorageError("No files provided", "NO_FILES", { fileCount: 0 });
  }

  if (files.length > 10) {
    throw new StorageError(
      `Too many files: ${files.length}. Maximum: 10`,
      "TOO_MANY_FILES",
      { fileCount: files.length, maxFiles: 10 }
    );
  }

  try {
    let completed = 0;

    const uploadWithProgress = async (file: File): Promise<UploadResult> => {
      const result = await uploadImage(file, userId, {
        compress,
        onProgress: (progress) => {
          onProgress?.(progress);
          if (progress.status === "completed") {
            completed++;
            onOverallProgress?.(completed, files.length);
          }
        },
      });
      return result;
    };

    if (parallel) {
      // Upload all images in parallel
      return await Promise.all(files.map(uploadWithProgress));
    } else {
      // Upload images sequentially
      const results: UploadResult[] = [];
      for (const file of files) {
        const result = await uploadWithProgress(file);
        results.push(result);
      }
      return results;
    }
  } catch (error: any) {
    console.error("Error uploading images:", error);

    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to upload images: ${error.message}`,
      "BATCH_UPLOAD_ERROR",
      { fileCount: files.length, originalError: error }
    );
  }
}

/**
 * Delete an image from Supabase Storage with retry logic
 */
export async function deleteImage(
  path: string,
  options?: { retries?: number }
): Promise<void> {
  const { retries = 3 } = options || {};

  if (!path) {
    throw new StorageError("No path provided", "NO_PATH");
  }

  try {
    const supabase = createClient();

    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([path]);

        if (error) {
          throw error;
        }

        console.log(`Successfully deleted image: ${path}`);
        return;
      } catch (error: any) {
        lastError = error;
        console.error(`Delete attempt ${attempt + 1} failed:`, error);

        // Wait before retry
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 500)
          );
        }
      }
    }

    throw new StorageError(
      `Failed to delete image after ${retries} attempts: ${
        lastError?.message || "Unknown error"
      }`,
      "DELETE_FAILED",
      { path, originalError: lastError }
    );
  } catch (error: any) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to delete image: ${error.message}`,
      "DELETE_ERROR",
      { path, originalError: error }
    );
  }
}

/**
 * Delete multiple images from Supabase Storage
 */
export async function deleteImages(
  paths: string[],
  options?: { retries?: number; continueOnError?: boolean }
): Promise<{ deleted: string[]; failed: string[] }> {
  const { retries = 3, continueOnError = true } = options || {};

  if (!paths || paths.length === 0) {
    throw new StorageError("No paths provided", "NO_PATHS");
  }

  const deleted: string[] = [];
  const failed: string[] = [];

  try {
    const supabase = createClient();

    // Try batch delete first
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(paths);

        if (error) {
          throw error;
        }

        console.log(`Successfully deleted ${paths.length} images`);
        return { deleted: paths, failed: [] };
      } catch (error: any) {
        lastError = error;
        console.error(`Batch delete attempt ${attempt + 1} failed:`, error);

        // If batch delete fails and continueOnError is true, try individual deletes
        if (attempt === retries - 1 && continueOnError) {
          for (const path of paths) {
            try {
              await deleteImage(path, { retries: 1 });
              deleted.push(path);
            } catch (error) {
              console.error(`Failed to delete ${path}:`, error);
              failed.push(path);
            }
          }
          return { deleted, failed };
        }

        // Wait before retry
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 500)
          );
        }
      }
    }

    throw new StorageError(
      `Failed to delete images after ${retries} attempts: ${
        lastError?.message || "Unknown error"
      }`,
      "BATCH_DELETE_FAILED",
      { pathCount: paths.length, originalError: lastError }
    );
  } catch (error: any) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to delete images: ${error.message}`,
      "BATCH_DELETE_ERROR",
      { pathCount: paths.length, originalError: error }
    );
  }
}

/**
 * Convert File to base64 data URL (for preview purposes)
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Verify that the bucket exists and is accessible
 */
export async function verifyBucketAccess(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);

    if (error) {
      console.error("Bucket access error:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error verifying bucket access:", error);
    return false;
  }
}

/**
 * Get storage usage for a user
 */
export async function getStorageUsage(userId: string): Promise<{
  totalSize: number;
  imageCount: number;
  formattedSize: string;
}> {
  try {
    const supabase = createClient();

    // List all files for the user
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId);

    if (error) {
      throw new StorageError(
        `Failed to get storage usage: ${error.message}`,
        "STORAGE_USAGE_ERROR",
        { userId, originalError: error }
      );
    }

    const totalSize =
      data?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
    const imageCount = data?.length || 0;

    // Format size
    let formattedSize: string;
    if (totalSize < 1024) {
      formattedSize = `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      formattedSize = `${(totalSize / 1024).toFixed(2)} KB`;
    } else if (totalSize < 1024 * 1024 * 1024) {
      formattedSize = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    } else {
      formattedSize = `${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    return {
      totalSize,
      imageCount,
      formattedSize,
    };
  } catch (error: any) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to get storage usage: ${error.message}`,
      "STORAGE_USAGE_ERROR",
      { userId, originalError: error }
    );
  }
}

/**
 * Constants and utilities export
 */
export const STORAGE_CONSTANTS = {
  BUCKET_NAME,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB: MAX_FILE_SIZE / 1024 / 1024,
  ALLOWED_TYPES,
  MAX_FILES: 10,
} as const;
