/**
 * Session Validation API Endpoint
 * POST /api/sessions/validate
 * 
 * Validates if a marketplace session is still valid
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateSession, touchSession } from "@/lib/sessions/storage";

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

    // Validate session
    const result = await validateSession(user.id, marketplace);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Validation failed" },
        { status: 500 }
      );
    }

    // Update last validated timestamp if valid
    if (result.isValid) {
      await touchSession(user.id, marketplace);
    }

    return NextResponse.json({
      success: true,
      marketplace,
      isValid: result.isValid,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SessionValidate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
