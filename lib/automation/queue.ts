/**
 * Job Queue System for Listing Automation
 * Uses Bull for reliable job processing
 */

import Queue from "bull";
import type { Job } from "bull";
import type { ListingJobData, ListingJobResult, MarketplaceType } from "./types";
import { PoshmarkBot } from "./bots/poshmark";
import { MercariBot } from "./bots/mercari";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Redis connection (configure based on environment)
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Listing Queue - handles all marketplace listing jobs
 */
export const listingQueue = new Queue<ListingJobData>("listing-automation", REDIS_URL, {
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 second delay, doubles each retry
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
  settings: {
    maxStalledCount: 3, // Max times a job can stall before failing
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    lockDuration: 300000, // Jobs lock for 5 minutes max
  },
});

/**
 * Process listing jobs
 */
listingQueue.process(async (job: Job<ListingJobData>) => {
  const { marketplace, userId, listing } = job.data;

  console.log(
    `[Queue] Processing listing job ${job.id} for ${marketplace} - User ${userId}`
  );

  // Update progress
  await job.progress(10);

  try {
    // Get marketplace credentials from database
    const credentials = await getMarketplaceCredentials(userId, marketplace);
    if (!credentials) {
      throw new Error(`No credentials found for ${marketplace}`);
    }

    await job.progress(20);

    // Create appropriate bot
    const bot = createBot(marketplace);
    if (!bot) {
      throw new Error(`Unsupported marketplace: ${marketplace}`);
    }

    await job.progress(30);

    // Login to marketplace
    console.log(`[Queue] Logging in to ${marketplace}...`);
    await bot.login(credentials);

    await job.progress(50);

    // Create listing
    console.log(`[Queue] Creating listing on ${marketplace}...`);
    const result = await bot.createListing(job.data);

    await job.progress(90);

    // Save result to database
    await saveListingResult(job.data.listingId, marketplace, result);

    await job.progress(100);

    // Cleanup
    await bot.close();

    console.log(`[Queue] Job ${job.id} completed successfully`);
    return result;
  } catch (error: any) {
    console.error(`[Queue] Job ${job.id} failed:`, error);

    // Save error to database
    await saveListingError(job.data.listingId, marketplace, error.message);

    throw error; // Re-throw to let Bull handle retries
  }
});

/**
 * Event handlers for monitoring
 */
listingQueue.on("completed", (job: Job, result: ListingJobResult) => {
  console.log(`✅ Job ${job.id} completed:`, {
    marketplace: result.marketplace,
    success: result.success,
    url: result.url,
  });
});

listingQueue.on("failed", (job: Job, error: Error) => {
  console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, error.message);
});

listingQueue.on("stalled", (job: Job) => {
  console.warn(`⚠️  Job ${job.id} stalled`);
});

listingQueue.on("progress", (job: Job, progress: number) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

/**
 * Add a listing job to the queue
 */
export async function queueListingJob(
  data: ListingJobData,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<Job<ListingJobData>> {
  const job = await listingQueue.add(data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: `${data.userId}-${data.marketplace}-${data.listingId}`,
  });

  console.log(`[Queue] Added job ${job.id} to queue`);
  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  result?: ListingJobResult;
  error?: string;
}> {
  const job = await listingQueue.getJob(jobId);

  if (!job) {
    return { status: "not_found", progress: 0 };
  }

  const state = await job.getState();
  const progress = job.progress();
  const failedReason = job.failedReason;

  let result;
  if (state === "completed") {
    result = job.returnvalue as ListingJobResult;
  }

  return {
    status: state,
    progress: typeof progress === "number" ? progress : 0,
    result,
    error: failedReason,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await listingQueue.getJob(jobId);
  if (!job) return false;

  await job.remove();
  console.log(`[Queue] Job ${jobId} cancelled`);
  return true;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    listingQueue.getWaitingCount(),
    listingQueue.getActiveCount(),
    listingQueue.getCompletedCount(),
    listingQueue.getFailedCount(),
    listingQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause the queue
 */
export async function pauseQueue(): Promise<void> {
  await listingQueue.pause();
  console.log("[Queue] Queue paused");
}

/**
 * Resume the queue
 */
export async function resumeQueue(): Promise<void> {
  await listingQueue.resume();
  console.log("[Queue] Queue resumed");
}

/**
 * Clean old jobs
 */
export async function cleanOldJobs(
  gracePeriodMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  await listingQueue.clean(gracePeriodMs, "completed");
  await listingQueue.clean(gracePeriodMs * 7, "failed"); // Keep failed jobs longer
  console.log("[Queue] Old jobs cleaned");
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create bot instance for marketplace
 */
function createBot(marketplace: MarketplaceType) {
  switch (marketplace) {
    case "poshmark":
      return new PoshmarkBot();
    case "mercari":
      return new MercariBot();
    // Add more marketplaces here
    default:
      return null;
  }
}

/**
 * Get marketplace credentials from database
 */
async function getMarketplaceCredentials(userId: string, marketplace: MarketplaceType) {
  try {
    // Use service role key to bypass RLS (worker runs server-side)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const { data, error } = await supabase
      .from('marketplace_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('marketplace', marketplace)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`[Queue] Error fetching credentials for ${marketplace}:`, error);
      return null;
    }

    if (!data) {
      console.error(`[Queue] No credentials found for ${marketplace}`);
      return null;
    }

    // Return full credentials object matching MarketplaceCredentials type
    return {
      id: data.id,
      userId: data.user_id,
      marketplace: data.marketplace as MarketplaceType,
      email: data.email || undefined,
      username: data.username || undefined,
      password: data.password || '', // Empty string if null (cookies are used instead)
      cookies: data.cookies || undefined, // Already JSON string from database
      isActive: data.is_active,
      lastUsed: data.last_used ? new Date(data.last_used) : undefined,
      failureCount: data.failure_count || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  } catch (error) {
    console.error(`[Queue] Exception getting credentials:`, error);
    return null;
  }
}

/**
 * Save listing result to database
 */
async function saveListingResult(
  listingId: string,
  marketplace: MarketplaceType,
  result: ListingJobResult
): Promise<void> {
  // TODO: Implement database update
  // Update the listing record with marketplace-specific data

  // const { error } = await supabase
  //   .from('listings')
  //   .update({
  //     [`${marketplace}_listing_id`]: result.listingId,
  //     [`${marketplace}_url`]: result.url,
  //     [`${marketplace}_status`]: result.success ? 'published' : 'failed',
  //     [`${marketplace}_posted_at`]: result.timestamp,
  //   })
  //   .eq('id', listingId);

  console.log(`[Database] Saved result for listing ${listingId} on ${marketplace}`);
}

/**
 * Save listing error to database
 */
async function saveListingError(
  listingId: string,
  marketplace: MarketplaceType,
  error: string
): Promise<void> {
  // TODO: Implement error logging

  // await supabase
  //   .from('listing_errors')
  //   .insert({
  //     listing_id: listingId,
  //     marketplace,
  //     error_message: error,
  //     created_at: new Date(),
  //   });

  console.log(`[Database] Saved error for listing ${listingId} on ${marketplace}`);
}
