/**
 * API Route: Delete user account
 * DELETE /api/auth/delete-account
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Call the delete_user function which handles all cleanup
    const { error: deleteError } = await supabase.rpc("delete_user");

    if (deleteError) {
      console.error("[API] Delete account error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete account" },
        { status: 500 },
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("[API] Delete account error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 },
    );
  }
}
