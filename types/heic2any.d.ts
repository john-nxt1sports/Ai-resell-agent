/**
 * Type declarations for heic2any library
 * @see https://github.com/nicolo-ribaudo/heic2any
 */
declare module "heic2any" {
  interface HeicOptions {
    /** The HEIC/HEIF blob to convert */
    blob: Blob;
    /** Output format (default: "image/jpeg") */
    toType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    /** Output quality 0-1 (default: 0.92) */
    quality?: number;
    /** Enable for multi-image HEIC files */
    multiple?: boolean;
  }

  /**
   * Convert HEIC/HEIF image to another format.
   * Returns a single Blob by default, or Blob[] when `multiple: true`.
   */
  function heic2any(options: HeicOptions & { multiple: true }): Promise<Blob[]>;
  function heic2any(options: HeicOptions): Promise<Blob | Blob[]>;

  export default heic2any;
}
