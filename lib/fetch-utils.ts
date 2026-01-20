/**
 * Fetch utilities with timeout, retry, and error handling
 * @module fetch-utils
 */

export interface FetchOptions extends RequestInit {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export interface RetryOptions extends FetchOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
}

/**
 * Fetch wrapper with timeout support.
 * Prevents hanging requests and provides better error messages.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise<Response>
 * @throws Error if request times out or fails
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', {}, 5000);
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry wrapper for fetch requests with exponential backoff.
 * Useful for flaky network conditions or transient server errors.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param timeoutMs - Timeout per request in ms (default: 30000)
 * @returns Promise<Response>
 * @throws Error after all retries exhausted
 *
 * @example
 * const response = await fetchWithRetry('/api/data', { method: 'POST' }, 3);
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  timeoutMs: number = 30000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Don't retry on client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - will retry
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout for the last attempt
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export interface FetchJSONOptions extends RequestInit {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * JSON fetch helper with automatic parsing and error handling.
 * Automatically sets Content-Type header and parses JSON response.
 *
 * @template T - The expected response type
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise<T> - Parsed JSON response
 * @throws Error with HTTP status and response body on failure
 *
 * @example
 * interface User { id: string; name: string; }
 * const user = await fetchJSON<User>('/api/user/123');
 */
export async function fetchJSON<T>(
  url: string,
  options: FetchJSONOptions = {},
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const response = await fetchWithTimeout(
    url,
    {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...fetchOptions.headers,
      },
    },
    timeout,
  );

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || JSON.stringify(errorData);
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  return response.json();
}

/**
 * POST JSON helper - convenience wrapper for POST requests
 *
 * @template T - The expected response type
 * @template D - The request body type
 * @param url - The URL to post to
 * @param data - The data to send (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Promise<T> - Parsed JSON response
 *
 * @example
 * const result = await postJSON<Response, RequestBody>('/api/create', { name: 'test' });
 */
export async function postJSON<T, D = unknown>(
  url: string,
  data: D,
  options: FetchJSONOptions = {},
): Promise<T> {
  return fetchJSON<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}
