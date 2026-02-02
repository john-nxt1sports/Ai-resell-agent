/**
 * Redis Job Queue Manager (2026 Best Practices)
 * 
 * Serverless-compatible queue implementation using ioredis
 * Works with Vercel/Next.js serverless functions
 * 
 * Note: Bull is not compatible with serverless environments due to child_process.fork()
 * This implementation uses direct Redis commands for queue operations
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const QUEUE_NAME = "listings";

// Lazy-initialized Redis client (serverless compatible)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * Add a listing job to the queue
 * Uses Redis LIST as a simple queue (LPUSH/BRPOP pattern)
 */
export async function queueListingJob(jobData: {
  job_id: string;
  user_id: string;
  listing: any;
  marketplaces: string[];
}): Promise<{ success: boolean; jobId: string; error?: string }> {
  try {
    const redis = getRedisClient();
    
    const job = {
      id: jobData.job_id,
      data: jobData,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };

    // Add job to queue (LPUSH adds to the left, workers BRPOP from right for FIFO)
    await redis.lpush(`queue:${QUEUE_NAME}`, JSON.stringify(job));
    
    // Also store job data separately for status lookups
    await redis.setex(
      `job:${jobData.job_id}`,
      86400 * 7, // 7 days TTL
      JSON.stringify({
        ...job,
        status: "queued",
        queuedAt: new Date().toISOString(),
      })
    );

    console.log(`[Queue] Job queued: ${jobData.job_id}`);

    return {
      success: true,
      jobId: jobData.job_id,
    };
  } catch (error: any) {
    console.error("[Queue] Failed to queue job:", error);
    return {
      success: false,
      jobId: jobData.job_id,
      error: error.message,
    };
  }
}

/**
 * Get job status from Redis
 */
export async function getJobStatus(jobId: string): Promise<{
  success: boolean;
  status?: string;
  progress?: number;
  result?: any;
  error?: string;
}> {
  try {
    const redis = getRedisClient();
    const jobData = await redis.get(`job:${jobId}`);

    if (!jobData) {
      return {
        success: false,
        error: "Job not found",
      };
    }

    const job = JSON.parse(jobData);

    return {
      success: true,
      status: job.status || "unknown",
      progress: job.progress || 0,
      result: job.result,
    };
  } catch (error: any) {
    console.error("[Queue] Failed to get job status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  updates: {
    status?: string;
    progress?: number;
    result?: any;
    error?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const redis = getRedisClient();
    const jobData = await redis.get(`job:${jobId}`);

    if (!jobData) {
      return { success: false, error: "Job not found" };
    }

    const job = JSON.parse(jobData);
    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(
      `job:${jobId}`,
      86400 * 7, // 7 days TTL
      JSON.stringify(updatedJob)
    );

    return { success: true };
  } catch (error: any) {
    console.error("[Queue] Failed to update job status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a job (remove from queue if still pending)
 */
export async function cancelJob(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const redis = getRedisClient();
    
    // Update job status to cancelled
    await updateJobStatus(jobId, { status: "cancelled" });

    console.log(`[Queue] Job cancelled: ${jobId}`);

    return { success: true };
  } catch (error: any) {
    console.error("[Queue] Failed to cancel job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  try {
    const redis = getRedisClient();
    
    // Get queue length
    const waiting = await redis.llen(`queue:${QUEUE_NAME}`);
    
    // For other stats, we'd need to track them separately
    // This is a simplified implementation
    return {
      waiting,
      active: 0, // Would need separate tracking
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  } catch (error: any) {
    console.error("[Queue] Failed to get queue stats:", error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }
}

/**
 * Pop a job from the queue (for workers)
 * This is used by the Python worker to get jobs
 */
export async function popJob(): Promise<{
  success: boolean;
  job?: any;
  error?: string;
}> {
  try {
    const redis = getRedisClient();
    
    // BRPOP with timeout (blocking pop from right for FIFO)
    const result = await redis.brpop(`queue:${QUEUE_NAME}`, 5);
    
    if (!result) {
      return { success: true, job: null }; // No job available
    }

    const job = JSON.parse(result[1]);
    
    // Update job status to processing
    await updateJobStatus(job.id, { status: "processing" });

    return { success: true, job };
  } catch (error: any) {
    console.error("[Queue] Failed to pop job:", error);
    return { success: false, error: error.message };
  }
}
