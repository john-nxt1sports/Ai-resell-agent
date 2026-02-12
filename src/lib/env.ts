/**
 * Environment Variable Validation
 * Validates that all required environment variables are set
 * Run this at application startup to fail fast if config is missing
 */

interface EnvConfig {
  // Public variables (safe to expose to client)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_APP_NAME?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_EXTENSION_ID?: string;
  NEXT_PUBLIC_MAX_IMAGE_SIZE?: string;
  NEXT_PUBLIC_MAX_IMAGES?: string;

  // Server-only variables (secrets)
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENROUTER_API_KEY: string;
  REDIS_URL: string;

  // Optional but recommended
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  SENTRY_DSN?: string;
  WORKER_PORT?: string;
}

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "REDIS_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

/**
 * Environment variables that should be secrets (server-side only)
 */
const SECRET_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "REDIS_URL",
  "SESSION_SECRET",
  "SENTRY_DSN",
] as const;

/**
 * Validate that required environment variables are set
 * Throws error with helpful message if any are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const errors: string[] = [];

  // Check for missing required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Validate format of URLs
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL.includes("supabase")) {
        errors.push(
          "NEXT_PUBLIC_SUPABASE_URL should be a Supabase URL (contains 'supabase')",
        );
      }
    } catch {
      errors.push("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
    }
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_APP_URL);
    } catch {
      errors.push("NEXT_PUBLIC_APP_URL must be a valid URL");
    }
  }

  if (process.env.REDIS_URL) {
    if (!process.env.REDIS_URL.startsWith("redis://")) {
      errors.push("REDIS_URL must start with redis://");
    }
  }

  // Validate API keys are not placeholder values
  const placeholderPatterns = [
    "your-",
    "example",
    "test",
    "placeholder",
    "xxx",
  ];

  for (const varName of SECRET_ENV_VARS) {
    const value = process.env[varName];
    if (value) {
      const lowerValue = value.toLowerCase();
      for (const pattern of placeholderPatterns) {
        if (lowerValue.includes(pattern)) {
          errors.push(
            `${varName} appears to be a placeholder value. Please set a real API key.`,
          );
          break;
        }
      }
    }
  }

  // Check for minimum key lengths
  if (
    process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_API_KEY.length < 20
  ) {
    errors.push("OPENROUTER_API_KEY appears to be too short to be valid");
  }

  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.length < 20
  ) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY appears to be too short to be valid",
    );
  }

  // Report errors
  if (missing.length > 0 || errors.length > 0) {
    const errorMessage = [
      "❌ Environment Configuration Error",
      "",
      missing.length > 0 ? "Missing required environment variables:" : "",
      ...missing.map((v) => `  - ${v}`),
      "",
      errors.length > 0 ? "Configuration errors:" : "",
      ...errors.map((e) => `  - ${e}`),
      "",
      "📝 Please check your .env.local file and compare with .env.example",
      "   See: .env.example for complete configuration guide",
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(errorMessage);
  }
}

/**
 * Get environment config with type safety
 * Call validateEnv() first to ensure all required vars are set
 */
export function getEnvConfig(): EnvConfig {
  return {
    // Public
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_EXTENSION_ID: process.env.NEXT_PUBLIC_EXTENSION_ID,
    NEXT_PUBLIC_MAX_IMAGE_SIZE: process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE,
    NEXT_PUBLIC_MAX_IMAGES: process.env.NEXT_PUBLIC_MAX_IMAGES,

    // Server-only
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
    REDIS_URL: process.env.REDIS_URL!,

    // Optional
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    WORKER_PORT: process.env.WORKER_PORT,
  };
}

/**
 * Check if we're running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if we're running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Get a safe version of the config for logging (secrets redacted)
 */
export function getSafeConfigForLogging(): Record<string, string> {
  const config = getEnvConfig();
  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    if (SECRET_ENV_VARS.includes(key as (typeof SECRET_ENV_VARS)[number])) {
      safe[key] = value ? "[REDACTED]" : "[NOT SET]";
    } else {
      safe[key] = value || "[NOT SET]";
    }
  }

  return safe;
}

/**
 * Validate on module load in server-side code only
 */
if (typeof window === "undefined") {
  // Only validate on server-side
  try {
    validateEnv();
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      // In production, fail fast
      console.error(error);
      process.exit(1);
    } else {
      // In development, just warn but allow to continue
      console.warn(error);
      console.warn(
        "⚠️  Running in development mode with incomplete environment configuration",
      );
    }
  }
}
