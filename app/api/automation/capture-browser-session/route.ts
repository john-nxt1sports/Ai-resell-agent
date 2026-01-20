/**
 * API Route: Capture Browser Session (Same Browser)
 * Captures session from user's current browser without opening new browser
 * POST /api/automation/capture-browser-session
 *
 * Note: This is now handled by the Chrome extension
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { marketplace } = body;

    if (!marketplace) {
      return NextResponse.json(
        { error: "Marketplace is required" },
        { status: 400 },
      );
    }

    // Validate marketplace
    const validMarketplaces = ["mercari", "poshmark", "ebay", "depop"];
    if (!validMarketplaces.includes(marketplace.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid marketplace. Must be one of: ${validMarketplaces.join(", ")}`,
        },
        { status: 400 },
      );
    }

    console.log(
      `[API] Session capture requested for ${marketplace} - User: ${user.id}`,
    );

    // This functionality is now handled by the Chrome extension
    // The extension uses the user's existing browser sessions
    return NextResponse.json({
      success: false,
      error: "Session capture now handled by Chrome extension",
      instructions: {
        step1: "Install the AI Resell Agent Chrome extension",
        step2: `Log into ${marketplace} in your browser`,
        step3: "The extension will detect your session automatically",
        step4:
          "Return to the app and click 'Refresh' to see connected marketplaces",
      },
      extensionRequired: true,
    });
  } catch (error: any) {
    console.error("[API] Browser session capture error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
