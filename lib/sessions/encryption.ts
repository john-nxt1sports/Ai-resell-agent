/**
 * Session Data Encryption Utilities (2026 Best Practices)
 * Uses AES-256-GCM for strong encryption of session data
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommends 96 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): string {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY environment variable is required. " +
      "Generate one with: openssl rand -base64 32"
    );
  }

  return key;
}

/**
 * Encrypt session data using AES-256-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @returns Base64-encoded encrypted data with IV, auth tag, and salt
 */
export function encryptSessionData(data: any): string {
  try {
    const plaintext = JSON.stringify(data);
    const key = getEncryptionKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key
    const derivedKey = deriveKey(key, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    // Return as base64
    return combined.toString("base64");
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt session data
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted and parsed data
 */
export function decryptSessionData(encryptedData: string): any {
  try {
    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive encryption key
    const derivedKey = deriveKey(key, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Parse and return
    return JSON.parse(decrypted);
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Verify encrypted data integrity without full decryption
 * Useful for quick validation checks
 */
export function verifyEncryptedData(encryptedData: string): boolean {
  try {
    // Try to decrypt - if it works, data is valid
    decryptSessionData(encryptedData);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash sensitive data for comparison without storing plaintext
 * Useful for cookie fingerprinting
 */
export function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a secure random token
 * Useful for browser profile IDs
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}
