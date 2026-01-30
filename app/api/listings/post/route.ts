/**
 * Post Listing to Python Worker (2026 Best Practices)
 * POST /api/listings/post
 * 
 * Queues listing job to Python worker via Redis
 * Worker will autonomously post to marketplaces using cloud browsers
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueListingJob } from "@/lib/queue/listings-queue";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    console.log("[PostListing API] Received post listing request");

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[PostListing API] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { listingId, marketplaces } = body;

    console.log(
      `[PostListing API] User: ${user.id}, Listing: ${listingId}, Marketplaces:`,
      marketplaces
    );

    // Validate input
    if (!listingId || !marketplaces || !Array.isArray(marketplaces)) {
      return NextResponse.json(
        { error: "listingId and marketplaces array required" },
        { status: 400 }
      );
    }

    if (marketplaces.length === 0) {
      return NextResponse.json(
        { error: "At least one marketplace required" },
        { status: 400 }
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
      console.log("[PostListing API] Listing not found");
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if user has sessions for requested marketplaces
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_marketplace_sessions")
      .select("marketplace, browser_profile_id, expires_at")
      .eq("user_id", user.id)
      .in("marketplace", marketplaces);

    if (sessionsError) {
      console.error("[PostListing API] Failed to check sessions:", sessionsError);
    }

    // Check which marketplaces have valid sessions
    const now = new Date();
    const validSessions = (sessions || []).filter((session) => {
      const expiresAt = new Date(session.expires_at);
      return expiresAt > now;
    });

    const sessionMarketplaces = new Set(validSessions.map((s) => s.marketplace));
    const missingSessionsMarketplaces = marketplaces.filter(
      (mp: string) => !sessionMarketplaces.has(mp)
    );

    if (missingSessionsMarketplaces.length > 0) {
      console.warn(
        "[PostListing API] Missing sessions for marketplaces:",
        missingSessionsMarketplaces
      );
      
      return NextResponse.json(
        {
          error: "Missing marketplace sessions",
          message: `Please log in to these marketplaces: ${missingSessionsMarketplaces.join(", ")}`,
          missingMarketplaces: missingSessionsMarketplaces,
        },
        { status: 400 }
      );
    }

    // Generate unique job ID
    const jobId = `job_${nanoid(16)}`;

    // Create automation results tracking in database
    const automationResults = [];
    for (const marketplace of marketplaces) {
      const { data: result, error: resultError } = await supabase
        .from("listing_automation_results")
        .insert({
          user_id: user.id,
          listing_id: listing.id,
          marketplace,
          job_id: jobId,
          status: "queued",
          progress: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (resultError) {
        console.error(
          "[PostListing API] Failed to create automation result:",
          resultError
        );
      } else {
        automationResults.push(result);
      }
    }

    // Queue job to Python worker via Redis
    const queueResult = await queueListingJob({
      job_id: jobId,
      user_id: user.id,
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        condition: listing.condition,
        brand: listing.brand,
        size: listing.size,
        color: listing.color,
        tags: listing.tags,
        images: listing.images,
      },
      marketplaces,
    });

    if (!queueResult.success) {
      console.error("[PostListing API] Failed to queue job:", queueResult.error);
      
      // Mark automation results as failed
      await supabase
        .from("listing_automation_results")
        .update({
          status: "failed",
          error_message: queueResult.error || "Failed to queue job",
        })
        .eq("job_id", jobId);

      return NextResponse.json(
        { error: queueResult.error || "Failed to queue job" },
        { status: 500 }
      );
    }

    console.log(
      `[PostListing API] ✅ Job queued successfully: ${jobId}`
    );

    return NextResponse.json({
      success: true,
      jobId,
      message: "Listing job queued successfully. Worker will process it autonomously.",
      marketplaces,
      automationResults: automationResults.map((r) => ({
        id: r.id,
        marketplace: r.marketplace,
        status: r.status,
      })),
    });
  } catch (error: any) {
    console.error("[PostListing API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
