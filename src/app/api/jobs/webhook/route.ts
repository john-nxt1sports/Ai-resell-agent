/**
 * Job Webhook Endpoint (2026 Best Practices)
 * POST /api/jobs/webhook
 *
 * Receives completion/progress notifications from Python worker
 * Updates database and triggers real-time notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[JobWebhook API] Received webhook");

    // Parse payload from Python worker
    const payload = await request.json();
    const {
      type,
      job_id,
      successful_platforms,
      total_platforms,
      results,
      error,
      marketplace,
      status,
      progress,
    } = payload;

    console.log(`[JobWebhook API] Type: ${type}, Job ID: ${job_id}`);

    // Create Supabase client
    const supabase = await createClient();

    // Handle different webhook types
    switch (type) {
      case "job_completed": {
        // Update all automation results for this job
        if (results && results.results) {
          for (const [marketplace, result] of Object.entries(results.results)) {
            const marketplaceResult = result as {
              success?: boolean;
              url?: string;
              error?: string;
            };

            await supabase
              .from("listing_automation_results")
              .update({
                status: marketplaceResult.success ? "completed" : "failed",
                external_url: marketplaceResult.url || null,
                error_message: marketplaceResult.error || null,
                progress: 100,
                completed_at: new Date().toISOString(),
              })
              .eq("job_id", job_id)
              .eq("marketplace", marketplace);
          }
        }

        console.log(
          `[JobWebhook API] ✅ Job completed: ${successful_platforms?.length || 0}/${total_platforms || 0} successful`,
        );

        // TODO: Send in-app notification to user
        // TODO: Trigger WebSocket update if connected

        return NextResponse.json({
          success: true,
          message: "Job completion processed",
          job_id,
        });
      }

      case "job_failed": {
        // Mark all pending jobs as failed
        await supabase
          .from("listing_automation_results")
          .update({
            status: "failed",
            error_message: error || "Job failed",
            completed_at: new Date().toISOString(),
          })
          .eq("job_id", job_id)
          .eq("status", "processing");

        console.log(`[JobWebhook API] ❌ Job failed: ${error}`);

        return NextResponse.json({
          success: true,
          message: "Job failure processed",
          job_id,
        });
      }

      case "job_progress": {
        // Update progress for specific marketplace
        if (marketplace) {
          await supabase
            .from("listing_automation_results")
            .update({
              status: status || "processing",
              progress: progress || 0,
            })
            .eq("job_id", job_id)
            .eq("marketplace", marketplace);

          console.log(
            `[JobWebhook API] 📊 Progress update: ${marketplace} - ${progress}%`,
          );
        }

        // TODO: Send real-time WebSocket update

        return NextResponse.json({
          success: true,
          message: "Progress updated",
          job_id,
        });
      }

      default: {
        console.warn(`[JobWebhook API] Unknown webhook type: ${type}`);
        return NextResponse.json(
          { error: "Unknown webhook type" },
          { status: 400 },
        );
      }
    }
  } catch (error: unknown) {
    console.error("[JobWebhook API] Error:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}
