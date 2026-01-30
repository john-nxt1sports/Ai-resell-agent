/**
 * Session Refresh API Endpoint
 * POST /api/sessions/refresh
 * 
 * Triggers the extension to re-capture session data
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { marketplace } = body;

    if (!marketplace) {
      return NextResponse.json(
        { error: "marketplace required" },
        { status: 400 }
      );
    }

    // In production, this would trigger a message to the browser extension
    // to re-capture session data. For now, we just return a success response
    // with instructions for the client.

    return NextResponse.json({
      success: true,
      marketplace,
      message: "Refresh requested. Extension will re-capture session data.",
      action: "REFRESH_SESSION",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SessionRefresh API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
