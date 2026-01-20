/**
 * API Route: Capture Marketplace Session
 * Opens browser for user to log in, captures cookies
 * POST /api/automation/capture-session
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureMarketplaceSession } from "@/lib/automation/session-capture";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { marketplace } = body;

    if (!marketplace) {
      return NextResponse.json(
        { error: "Marketplace is required" },
        { status: 400 }
      );
    }

    // Validate marketplace
    const validMarketplaces = ["mercari", "poshmark", "ebay", "depop"];
    if (!validMarketplaces.includes(marketplace.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid marketplace. Must be one of: ${validMarketplaces.join(", ")}` },
        { status: 400 }
      );
    }

    console.log(`[API] Starting session capture for ${marketplace} - User: ${user.id}`);

    // Capture session (this will open browser for user)
    const result = await captureMarketplaceSession(marketplace, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to capture session" },
        { status: 500 }
      );
    }

    // Save cookies to database
    const { error: dbError } = await supabase
      .from("marketplace_credentials")
      .upsert({
        user_id: user.id,
        marketplace: marketplace.toLowerCase(),
        cookies: result.cookies,
        is_active: true,
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,marketplace"
      });

    if (dbError) {
      console.error("[API] Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save session" },
        { status: 500 }
      );
    }

    console.log(`[API] Session captured and saved for ${marketplace}`);

    return NextResponse.json({
      success: true,
      marketplace,
      message: "Session captured successfully",
    });

  } catch (error: any) {
    console.error("[API] Session capture error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
