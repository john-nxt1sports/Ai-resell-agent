/**
 * Session Sync API Endpoint (2026 Best Practices)
 * POST /api/sessions/sync
 *
 * Receives encrypted session data from browser extension
 * Stores it securely and syncs to cloud browser profile
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/services/supabase/server";
import { storeSession } from "@/services/sessions/storage";
import { syncToCloudBrowser } from "@/services/sessions/cloud-sync";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log("[SessionSync API] Received session sync request");

    // Get auth token from header (browser extension sends Bearer token)
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.log("[SessionSync API] No auth token provided");
      return NextResponse.json(
        { error: "Unauthorized - no token" },
        { status: 401 },
      );
    }

    // Create admin client and verify the token
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    // Get user from the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log("[SessionSync API] Invalid token:", authError?.message);
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      marketplace,
      cookies,
      localStorage,
      sessionStorage,
      isLoggedIn,
      timestamp,
      userAgent,
    } = body;

    // Validate required fields
    if (!marketplace || !cookies || !Array.isArray(cookies)) {
      return NextResponse.json(
        { error: "Invalid request: marketplace and cookies required" },
        { status: 400 },
      );
    }

    // Validate marketplace
    const validMarketplaces = [
      "poshmark",
      "ebay",
      "mercari",
      "depop",
      "facebook",
    ];
    if (!validMarketplaces.includes(marketplace)) {
      return NextResponse.json(
        { error: `Invalid marketplace: ${marketplace}` },
        { status: 400 },
      );
    }

    // Check if user is logged in
    if (!isLoggedIn) {
      return NextResponse.json(
        {
          error: "Not logged in to marketplace",
          message: "Please log in to the marketplace in your browser first",
        },
        { status: 400 },
      );
    }

    console.log(
      `[SessionSync API] Syncing session for user ${user.id}, marketplace: ${marketplace}`,
    );

    // Store session
    const storeResult = await storeSession(user.id, {
      marketplace,
      cookies,
      localStorage: localStorage || {},
      sessionStorage: sessionStorage || {},
      isLoggedIn,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: userAgent || "unknown",
    });

    if (!storeResult.success) {
      console.error(
        "[SessionSync API] Failed to store session:",
        storeResult.error,
      );
      return NextResponse.json(
        { error: storeResult.error || "Failed to store session" },
        { status: 500 },
      );
    }

    // Sync to cloud browser profile
    if (storeResult.browserProfileId) {
      const syncResult = await syncToCloudBrowser(
        user.id,
        marketplace,
        storeResult.browserProfileId,
      );

      if (!syncResult.success) {
        console.warn(
          "[SessionSync API] Cloud sync failed (non-critical):",
          syncResult.error,
        );
      }
    }

    console.log(
      `[SessionSync API] ✅ Session synced successfully for ${marketplace}`,
    );

    return NextResponse.json({
      success: true,
      marketplace,
      browserProfileId: storeResult.browserProfileId,
      message: "Session synced successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[SessionSync API] Error:", error);
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

/**
 * GET /api/sessions/sync
 * Get all synced sessions for the current user
 */
export async function GET() {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sessions
    const { data: sessions, error } = await supabase
      .from("user_marketplace_sessions")
      .select(
        "marketplace, browser_profile_id, last_validated_at, expires_at, created_at",
      )
      .eq("user_id", user.id)
      .order("last_validated_at", { ascending: false });

    if (error) {
      console.error("[SessionSync API] Error fetching sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 },
      );
    }

    // Check which are expired
    const now = new Date();
    const sessionsWithStatus = (sessions || []).map((session) => ({
      marketplace: session.marketplace,
      browserProfileId: session.browser_profile_id,
      lastValidated: session.last_validated_at,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      isExpired: new Date(session.expires_at) < now,
      isValid: new Date(session.expires_at) >= now,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsWithStatus,
      count: sessionsWithStatus.length,
    });
  } catch (error: unknown) {
    console.error("[SessionSync API] Error:", error);
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
