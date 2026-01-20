/**
 * Structured Logging Utility
 * Provides consistent, secure logging across the application
 * Prevents sensitive data leakage and enables better production debugging
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

/**
 * Sensitive fields that should never be logged
 */
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "access_token",
  "refresh_token",
  "private_key",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "REDIS_URL",
];

/**
 * Check if logging is enabled for a given level
 */
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = (process.env.LOG_LEVEL || "info").toLowerCase();

  const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  return levels[level] <= levels[configuredLevel as keyof typeof levels];
}

/**
 * Sanitize an object by removing sensitive fields
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message based on structured logging preference
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const useStructured = process.env.STRUCTURED_LOGGING === "true";

  if (useStructured) {
    // JSON structured logging for production
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizeObject(context || {}),
    });
  } else {
    // Human-readable logging for development
    const contextStr = context
      ? ` ${JSON.stringify(sanitizeObject(context))}`
      : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, context);

  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedMessage);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage);
      break;
    case LogLevel.INFO:
      console.info(formattedMessage);
      break;
    case LogLevel.DEBUG:
      console.debug(formattedMessage);
      break;
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === "production" && level === LogLevel.ERROR) {
    // TODO: Send to Sentry or similar service
    // Sentry.captureMessage(message, { level: 'error', contexts: { custom: context } });
  }
}

/**
 * Public logging API
 */
export const logger = {
  error: (message: string, context?: LogContext) =>
    log(LogLevel.ERROR, message, context),

  warn: (message: string, context?: LogContext) =>
    log(LogLevel.WARN, message, context),

  info: (message: string, context?: LogContext) =>
    log(LogLevel.INFO, message, context),

  debug: (message: string, context?: LogContext) =>
    log(LogLevel.DEBUG, message, context),

  /**
   * Log an API request
   */
  apiRequest: (method: string, path: string, context?: LogContext) => {
    log(LogLevel.INFO, `API Request: ${method} ${path}`, {
      method,
      path,
      ...context,
    });
  },

  /**
   * Log an API response
   */
  apiResponse: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) => {
    const level = statusCode >= 500 ? LogLevel.ERROR : LogLevel.INFO;
    log(LogLevel.INFO, `API Response: ${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    });
  },

  /**
   * Log a database operation
   */
  database: (operation: string, table: string, context?: LogContext) => {
    log(LogLevel.DEBUG, `Database: ${operation} on ${table}`, {
      operation,
      table,
      ...context,
    });
  },

  /**
   * Log an authentication event
   */
  auth: (event: string, context?: LogContext) => {
    log(LogLevel.INFO, `Auth: ${event}`, context);
  },

  /**
   * Log an error with stack trace
   */
  errorWithStack: (message: string, error: Error, context?: LogContext) => {
    log(LogLevel.ERROR, message, {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      ...context,
    });
  },

  /**
   * Log security event (always logged regardless of level)
   */
  security: (message: string, context?: LogContext) => {
    const formattedMessage = formatLogMessage(LogLevel.WARN, message, {
      security: true,
      ...context,
    });
    console.warn(formattedMessage);

    // In production, always send security events to monitoring
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to security monitoring service
    }
  },
};

/**
 * Middleware to log all API requests and responses
 */
export function withLogging(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Generate request ID for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.apiRequest(method, path, { requestId });

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      logger.apiResponse(method, path, response.status, duration, {
        requestId,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error) {
        logger.errorWithStack(
          `API Error: ${method} ${path}`,
          error,
          { requestId, duration }
        );
      } else {
        logger.error(`API Error: ${method} ${path}`, {
          requestId,
          duration,
          error: String(error),
        });
      }

      throw error;
    }
  };
}

/**
 * Create a child logger with preset context
 */
export function createChildLogger(baseContext: LogContext) {
  return {
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...baseContext, ...context }),

    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),

    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),

    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
  };
}
