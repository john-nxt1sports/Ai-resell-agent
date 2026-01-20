/**
 * API Route: Save Marketplace Cookies
 * Saves cookies from user's browser with encryption
 * POST /api/automation/save-cookies
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptJSON } from "@/lib/security/encryption";

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
    const { marketplace, cookies } = body;

    if (!marketplace || !cookies) {
      return NextResponse.json(
        { error: "Marketplace and cookies are required" },
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

    // Parse cookies if they're a string
    let cookieData: any;
    try {
      cookieData = typeof cookies === 'string' ? JSON.parse(cookies) : cookies;
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid cookie format. Must be valid JSON array." },
        { status: 400 }
      );
    }

    // Validate cookie format
    if (!Array.isArray(cookieData) || cookieData.length === 0) {
      return NextResponse.json(
        { error: "Cookies must be a non-empty array" },
        { status: 400 }
      );
    }

    // Convert to Playwright cookie format
    const playwrightCookies = cookieData.map((cookie: any) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || `.${marketplace.toLowerCase()}.com`,
      path: cookie.path || '/',
      expires: cookie.expires || -1,
      httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : false,
      secure: cookie.secure !== undefined ? cookie.secure : true,
      sameSite: cookie.sameSite || 'Lax',
    }));

    // Encrypt cookies before storing
    let encryptedCookies: string | null = null;
    try {
      encryptedCookies = encryptJSON(playwrightCookies);
    } catch (encryptError) {
      // If encryption fails (e.g., no key), store as JSON but log warning
      // In production, this should fail hard
      if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
        return NextResponse.json(
          { error: "Server misconfiguration: encryption not available" },
          { status: 500 }
        );
      }
      encryptedCookies = JSON.stringify(playwrightCookies);
    }

    // Save to database with encrypted cookies
    const { error: dbError } = await supabase
      .from("marketplace_credentials")
      .upsert({
        user_id: user.id,
        marketplace: marketplace.toLowerCase(),
        password_encrypted: null,
        cookies: { encrypted: encryptedCookies },
        is_active: true,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,marketplace"
      });

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to save credentials to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      marketplace,
      message: `${marketplace} account connected successfully`,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
