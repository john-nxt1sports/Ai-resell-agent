/**
 * CSRF Protection Utility
 * Implements CSRF token generation and validation
 * Protects state-changing operations from cross-site request forgery
 */

import { cookies } from "next/headers";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  // Generate random bytes
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== "undefined" && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hex string
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Set CSRF token in cookies
 */
export async function setCsrfToken(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TOKEN_EXPIRY_MS / 1000,
      path: "/",
    });
  } catch (error) {
    console.error("[CSRF] Failed to set CSRF token:", error);
  }
}

/**
 * Generate and set a new CSRF token
 */
export async function generateCsrfToken(): Promise<string> {
  const token = generateToken();
  await setCsrfToken(token);
  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  // Get token from cookie
  const cookieToken = await getCsrfToken();
  if (!cookieToken) {
    return false;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return false;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware to protect routes with CSRF validation
 * Use this for all state-changing operations (POST, PUT, DELETE, PATCH)
 */
export function withCsrfProtection(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const method = request.method.toUpperCase();

    // Only check CSRF for state-changing methods
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const isValid = await validateCsrfToken(request);

      if (!isValid) {
        return new Response(
          JSON.stringify({
            error: "Invalid or missing CSRF token",
            code: "CSRF_TOKEN_INVALID",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return handler(request);
  };
}

/**
 * API endpoint to get CSRF token
 * Client should call this before making state-changing requests
 */
export async function handleGetCsrfToken(): Promise<Response> {
  const token = await generateCsrfToken();

  return new Response(
    JSON.stringify({
      token,
      headerName: CSRF_HEADER_NAME,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Check if CSRF protection should be enforced
 * Can be disabled in development or for specific routes
 */
export function shouldEnforceCsrf(): boolean {
  // In development, can optionally disable CSRF for easier testing
  if (process.env.NODE_ENV === "development" && process.env.DISABLE_CSRF === "true") {
    return false;
  }

  return true;
}

/**
 * Wrapper that conditionally applies CSRF protection
 */
export function withCsrfProtectionConditional(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  if (shouldEnforceCsrf()) {
    return withCsrfProtection(handler);
  }
  return handler;
}
