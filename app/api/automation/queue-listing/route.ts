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

    // Create automation results in database for each marketplace
    // Extension will poll for pending jobs
    const jobs = await Promise.all(
      marketplaces.map(async (marketplace: string) => {
        // Insert into listing_automation_results table
        const { data: result, error: resultError } = await supabase
          .from("listing_automation_results")
          .insert({
            user_id: user.id,
            listing_id: listing.id,
            marketplace,
            status: "pending",
            listing_data: {
              title: listing.title,
              description: listing.description || "",
              price: listing.price,
              category: listing.category,
              condition: listing.condition,
              brand: listing.brand,
              size: listing.size,
              color: listing.color,
              tags: listing.tags,
              images: listing.images,
            },
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (resultError) {
          console.error(
            `[Queue API] Error creating job for ${marketplace}:`,
            resultError,
          );
          throw resultError;
        }

        return {
          marketplace,
          jobId: result?.id,
        };
      }),
    );

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
