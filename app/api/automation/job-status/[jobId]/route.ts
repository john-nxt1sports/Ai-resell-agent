/**
 * API Route: Get job status
 * GET /api/automation/job-status/[jobId]
 *
 * Gets job status from database (used with Chrome extension approach)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get job from database
    const { data: job, error } = await supabase
      .from("listing_automation_results")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      marketplace: job.marketplace,
      listingId: job.listing_id,
      externalUrl: job.external_url,
      error: job.error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (error: any) {
    console.error("[API] Get job status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get job status" },
      { status: 500 },
    );
  }
}
