/**
 * Health Check Endpoint
 * Provides system health status for monitoring and load balancers
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
    };
    redis?: {
      status: "up" | "down";
      latency?: number;
    };
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{
  status: "up" | "down";
  latency?: number;
}> {
  try {
    const start = Date.now();
    const supabase = await createClient();

    // Simple query to check connectivity
    const { error } = await supabase.from("profiles").select("id").limit(1);

    const latency = Date.now() - start;

    if (error) {
      logger.error("Health check: Database check failed", { error: error.message });
      return { status: "down" };
    }

    return { status: "up", latency };
  } catch (error) {
    logger.error("Health check: Database check error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "down" };
  }
}

/**
 * Check Redis connectivity (optional)
 */
async function checkRedis(): Promise<{
  status: "up" | "down";
  latency?: number;
}> {
  // Only check Redis if it's configured
  if (!process.env.REDIS_URL) {
    return { status: "up" }; // Skip check if not configured
  }

  try {
    // TODO: Implement Redis health check
    // For now, just return up
    return { status: "up" };
  } catch (error) {
    logger.error("Health check: Redis check error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "down" };
  }
}

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET(): Promise<Response> {
  try {
    const startTime = Date.now();

    // Run health checks in parallel
    const [databaseCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (databaseCheck.status === "down") {
      overallStatus = "unhealthy";
    } else if (redisCheck.status === "down") {
      overallStatus = "degraded";
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: databaseCheck,
        redis: redisCheck,
      },
    };

    const duration = Date.now() - startTime;

    // Log health check
    if (overallStatus !== "healthy") {
      logger.warn("Health check: System not healthy", {
        status: overallStatus,
        duration,
        checks: healthStatus.checks,
      });
    } else {
      logger.debug("Health check: System healthy", {
        duration,
      });
    }

    // Return appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

    return new Response(JSON.stringify(healthStatus), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Health check: Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
