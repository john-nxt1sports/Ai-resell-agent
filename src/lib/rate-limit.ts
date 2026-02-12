/**
 * Rate Limiting Utility
 * Implements in-memory rate limiting for API endpoints
 * For production, consider using Redis-based rate limiting for distributed systems
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string; // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
// In production with multiple instances, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if a request should be rate limited
 * Returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    // No entry or expired entry - create new
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return false;
  }

  if (entry.count >= config.max) {
    // Rate limit exceeded
    return true;
  }

  // Increment count
  entry.count++;
  return false;
}

/**
 * Get remaining requests for an identifier
 */
export function getRemainingRequests(
  identifier: string,
  config: RateLimitConfig
): number {
  const entry = rateLimitStore.get(identifier);
  if (!entry || entry.resetTime < Date.now()) {
    return config.max;
  }
  return Math.max(0, config.max - entry.count);
}

/**
 * Get reset time for an identifier
 */
export function getResetTime(identifier: string): number | null {
  const entry = rateLimitStore.get(identifier);
  if (!entry || entry.resetTime < Date.now()) {
    return null;
  }
  return entry.resetTime;
}

/**
 * Reset rate limit for an identifier (useful for testing or admin overrides)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // AI endpoints - expensive operations
  AI_GENERATE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AI_REQUESTS_PER_HOUR || "100", 10),
    message: "Too many AI requests. Please try again later.",
  },

  // Authentication endpoints
  AUTH_SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: "Too many signup attempts. Please try again later.",
  },

  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: "Too many login attempts. Please try again later.",
  },

  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: "Too many password reset requests. Please try again later.",
  },

  // Public endpoints
  PUBLIC_API: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: parseInt(
      process.env.RATE_LIMIT_PUBLIC_REQUESTS_PER_HOUR || "1000",
      10
    ),
    message: "Too many requests. Please try again later.",
  },

  // Support tickets
  SUPPORT_TICKET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: "Too many support ticket submissions. Please try again later.",
  },

  // Automation endpoints
  AUTOMATION_QUEUE: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: "Too many automation requests. Please slow down.",
  },
} as const;

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
  identifier: string,
  config: RateLimitConfig
): Record<string, string> {
  const remaining = getRemainingRequests(identifier, config);
  const resetTime = getResetTime(identifier);

  return {
    "X-RateLimit-Limit": config.max.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime
      ? Math.ceil(resetTime / 1000).toString()
      : "",
  };
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * Usage: export const POST = withRateLimit(handler, RATE_LIMITS.AI_GENERATE, 'ai')
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  config: RateLimitConfig,
  identifierPrefix: string = "ip"
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      // Get identifier (user ID if authenticated, IP address otherwise)
      const identifier = await getRateLimitIdentifier(request, identifierPrefix);

      // Check rate limit
      if (isRateLimited(identifier, config)) {
        const headers = getRateLimitHeaders(identifier, config);
        const resetTime = getResetTime(identifier);
        const retryAfter = resetTime
          ? Math.ceil((resetTime - Date.now()) / 1000)
          : Math.ceil(config.windowMs / 1000);

        return new Response(
          JSON.stringify({
            error: config.message || "Rate limit exceeded",
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString(),
              ...headers,
            },
          }
        );
      }

      // Add rate limit headers to response
      const response = await handler(request);
      const headers = getRateLimitHeaders(identifier, config);

      // Clone response to add headers
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(headers)) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error("[RateLimit] Error in rate limit middleware:", error);
      // On error, allow request to proceed (fail open for availability)
      return handler(request);
    }
  };
}

/**
 * Get rate limit identifier from request
 * Tries to use user ID if authenticated, falls back to IP address
 */
async function getRateLimitIdentifier(
  request: Request,
  prefix: string
): Promise<string> {
  // Try to get user ID from session (requires auth context)
  // For now, use IP address as identifier
  const ip = getClientIp(request);
  return `${prefix}:${ip}`;
}

/**
 * Extract client IP address from request
 * Handles various proxy headers
 */
function getClientIp(request: Request): string {
  // Check for forwarded IP (from proxies like Vercel, Cloudflare)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Get first IP in chain
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback
  return "unknown";
}
