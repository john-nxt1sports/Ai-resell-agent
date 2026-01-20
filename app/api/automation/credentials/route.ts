/**
 * API Route: Save marketplace credentials
 * POST /api/automation/credentials
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { marketplace, email, username, password } = body;

    if (!marketplace || !password || (!email && !username)) {
      return NextResponse.json(
        { error: "marketplace, password, and email/username required" },
        { status: 400 }
      );
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if credentials already exist
    const { data: existing } = await supabase
      .from("marketplace_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("marketplace", marketplace)
      .single();

    if (existing) {
      // Update existing credentials
      const { error: updateError } = await supabase
        .from("marketplace_credentials")
        .update({
          email,
          username,
          password: hashedPassword,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: "Credentials updated successfully",
      });
    } else {
      // Insert new credentials
      const { error: insertError } = await supabase
        .from("marketplace_credentials")
        .insert({
          user_id: user.id,
          marketplace,
          email,
          username,
          password: hashedPassword,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: "Credentials saved successfully",
      });
    }
  } catch (error: any) {
    console.error("[API] Save credentials error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save credentials" },
      { status: 500 }
    );
  }
}

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

    // Get all marketplace credentials (without passwords)
    const { data, error } = await supabase
      .from("marketplace_credentials")
      .select("id, marketplace, email, username, is_active, last_used, created_at")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ credentials: data || [] });
  } catch (error: any) {
    console.error("[API] Get credentials error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get credentials" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json({ error: "Credential ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("marketplace_credentials")
      .delete()
      .eq("id", credentialId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Credentials deleted successfully",
    });
  } catch (error: any) {
    console.error("[API] Delete credentials error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete credentials" },
      { status: 500 }
    );
  }
}
