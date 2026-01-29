/**
 * API Route: Queue a listing to marketplace(s) via Chrome Extension
 * POST /api/automation/queue-listing
 *
 * This stores job information in the database for the extension to process.
 * No credentials needed - extension uses user's existing browser sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[Queue API] Received queue listing request");

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[Queue API] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Queue API] User: ${user.id}`);

    // Parse request body
    const body = await request.json();
    const { listingId, marketplaces } = body;

    console.log(
      `[Queue API] Listing ID: ${listingId}, Marketplaces:`,
      marketplaces,
    );

    if (!listingId || !marketplaces || !Array.isArray(marketplaces)) {
      return NextResponse.json(
        { error: "listingId and marketplaces array required" },
        { status: 400 },
      );
    }

    // Get listing from database
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Try to create automation results in database for tracking
    // This is optional - the extension receives jobs directly via postMessage
    const jobs = [];
    for (const marketplace of marketplaces) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Try to insert into listing_automation_results table (optional tracking)
        const { data: result, error: resultError } = await supabase
          .from("listing_automation_results")
          .insert({
            user_id: user.id,
            listing_id: listing.id,
            marketplace,
            job_id: jobId,
            status: "queued",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (resultError) {
          console.log(
            `[Queue API] Could not save job to database (non-critical):`,
            resultError.message,
          );
        }

        jobs.push({
          marketplace,
          jobId: result?.id || jobId,
        });
      } catch (dbError) {
        // Database insert failed, but that's OK - extension will still get the job
        console.log(`[Queue API] Database error (non-critical):`, dbError);
        jobs.push({
          marketplace,
          jobId,
        });
      }
    }

    console.log(`[Queue API] ✅ All jobs created for extension to process`);

    return NextResponse.json({
      success: true,
      jobs,
      message: `Listing queued for ${marketplaces.length} marketplace(s). Open the extension to start posting!`,
      extensionRequired: true,
    });
  } catch (error: any) {
    console.error("[API] Queue listing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to queue listing" },
      { status: 500 },
    );
  }
}

// GET endpoint for extension to poll for pending jobs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending jobs for this user
    const { data: jobs, error } = await supabase
      .from("listing_automation_results")
      .select(
        `
        *,
        listings (
          id,
          title,
          description,
          price,
          category,
          condition,
          brand,
          size,
          color,
          tags,
          images
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
    });
  } catch (error: any) {
    console.error("[API] Get pending jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get pending jobs" },
      { status: 500 },
    );
  }
}
