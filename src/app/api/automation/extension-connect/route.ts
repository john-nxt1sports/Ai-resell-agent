/**
 * API Route: Extension Connection
 * POST /api/automation/extension-connect
 *
 * Allows the Chrome extension to connect and verify user authentication
 */

import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return user info for extension to use
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      connected: true,
    });
  } catch (error: unknown) {
    console.error("[API] Extension connect error:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to connect extension",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    return NextResponse.json({
      connected: true,
      userId: user.id,
    });
  } catch {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
