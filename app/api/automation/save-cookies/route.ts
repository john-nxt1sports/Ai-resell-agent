/**
 * API Route: Save Marketplace Cookies
 * Saves cookies from user's browser (manual paste method)
 * POST /api/automation/save-cookies
 * 
 * Security features:
 * - Rate limiting
 * - Input validation
 * - Structured logging (cookies redacted)
 * - CSRF protection
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logger } from "@/lib/logger";
import { withCsrfProtectionConditional } from "@/lib/csrf";
import { 
  validateRequestBody, 
  validateMarketplace, 
  ValidationError 
} from "@/lib/validation";

async function handler(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized cookie save attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await validateRequestBody(request);
    const { marketplace, cookies } = body;

    if (!marketplace || !cookies) {
      throw new ValidationError("Marketplace and cookies are required");
    }

    // Validate marketplace
    validateMarketplace(marketplace);

    logger.info("Saving marketplace cookies", { 
      userId: user.id, 
      marketplace 
    });

    // Parse cookies if they're a string
    let cookieData: any;
    try {
      cookieData = typeof cookies === 'string' ? JSON.parse(cookies) : cookies;
    } catch (parseError) {
      throw new ValidationError("Invalid cookie format. Must be valid JSON array.", "cookies");
    }

    // Validate cookie format (should be array of cookie objects)
    if (!Array.isArray(cookieData) || cookieData.length === 0) {
      throw new ValidationError("Cookies must be a non-empty array", "cookies");
    }

    // Validate cookie structure
    for (let i = 0; i < cookieData.length; i++) {
      const cookie = cookieData[i];
      if (!cookie.name || !cookie.value) {
        throw new ValidationError(
          `Cookie at index ${i} missing required fields (name, value)`,
          "cookies"
        );
      }
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

    // TODO: Encrypt cookies before storing
    // For now, storing as JSON (security note: should be encrypted)
    
    // Save to database
    const { error: dbError } = await supabase
      .from("marketplace_credentials")
      .upsert({
        user_id: user.id,
        marketplace: marketplace.toLowerCase(),
        password: null, // Explicitly set to null for cookie-based auth
        cookies: JSON.stringify(playwrightCookies),
        is_active: true,
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,marketplace"
      });

    if (dbError) {
      logger.error("Database error saving cookies", { 
        userId: user.id, 
        marketplace, 
        error: dbError.message 
      });
      return NextResponse.json(
        { error: "Failed to save cookies" },
        { status: 500 }
      );
    }

    logger.info("Cookies saved successfully", { 
      userId: user.id, 
      marketplace 
    });

    return NextResponse.json({
      success: true,
      marketplace,
      message: `${marketplace} account connected successfully`,
    });

  } catch (error: any) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      logger.warn("Validation error saving cookies", { 
        field: error.field, 
        message: error.message 
      });
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      );
    }

    logger.errorWithStack("Save cookies error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Apply middleware: Rate limiting -> Logging -> CSRF protection
export const POST = withRateLimit(
  withLogging(
    withCsrfProtectionConditional(handler)
  ),
  RATE_LIMITS.AUTOMATION_QUEUE,
  'save-cookies'
);
