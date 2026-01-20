/**
 * CSRF Token Endpoint
 * Provides CSRF tokens for client-side requests
 */

import { handleGetCsrfToken } from "@/lib/csrf";
import { withLogging } from "@/lib/logger";

/**
 * GET /api/csrf
 * Get a CSRF token for client-side use
 */
export const GET = withLogging(async (): Promise<Response> => {
  return handleGetCsrfToken();
});
