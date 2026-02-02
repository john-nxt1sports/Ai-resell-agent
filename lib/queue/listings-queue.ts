/**
 * Redis Job Queue Manager (2026 Best Practices)
 * 
 * Manages job queue for Python worker using Bull and Redis
 */

import Queue from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Create Bull queue for listings
export const listingsQueue = new Queue("listings", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

/**
 * Add a listing job to the queue
 */
export async function queueListingJob(jobData: {
  job_id: string;
  user_id: string;
  listing: any;
  marketplaces: string[];
}): Promise<{ success: boolean; jobId: string; error?: string }> {
  try {
    const job = await listingsQueue.add(jobData, {
      jobId: jobData.job_id,
      priority: 1,
    });

    console.log(`[Queue] Job queued: ${job.id}`);

    return {
      success: true,
      jobId: job.id as string,
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
 * Get job status from queue
 */
export async function getJobStatus(jobId: string): Promise<{
  success: boolean;
  status?: string;
  progress?: number;
  result?: any;
  error?: string;
}> {
  try {
    const job = await listingsQueue.getJob(jobId);

    if (!job) {
      return {
        success: false,
        error: "Job not found",
      };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      success: true,
      status: state,
      progress: typeof progress === "number" ? progress : 0,
      result: job.returnvalue,
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
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const job = await listingsQueue.getJob(jobId);

    if (!job) {
      return {
        success: false,
        error: "Job not found",
      };
    }

    await job.remove();

    console.log(`[Queue] Job cancelled: ${jobId}`);

    return {
      success: true,
    };
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
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      listingsQueue.getWaitingCount(),
      listingsQueue.getActiveCount(),
      listingsQueue.getCompletedCount(),
      listingsQueue.getFailedCount(),
      listingsQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
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

// Event listeners for monitoring
listingsQueue.on("completed", (job, result) => {
  console.log(`[Queue] Job completed: ${job.id}`, result);
});

listingsQueue.on("failed", (job, err) => {
  console.error(`[Queue] Job failed: ${job?.id}`, err);
});

listingsQueue.on("stalled", (job) => {
  console.warn(`[Queue] Job stalled: ${job.id}`);
});
