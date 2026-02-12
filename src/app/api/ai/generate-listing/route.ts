/**
 * AI Listing Generation API Route
 * POST /api/ai/generate-listing
 *
 * Security features:
 * - Rate limiting (100 requests/hour per user)
 * - Input validation
 * - Structured logging
 * - CSRF protection
 */

import { NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { generateListing, estimateCost } from "@/services/ai/service";
import { ListingGenerationInput, AIModel } from "@/services/ai/types";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logger } from "@/lib/logger";
import { validateRequestBody, ValidationError } from "@/lib/validation";

async function handler(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized AI generation attempt", {
        error: authError?.message,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await validateRequestBody(request);
    const { input, model } = body as {
      input: ListingGenerationInput;
      model?: AIModel;
    };

    if (!input) {
      throw new ValidationError("Missing input data");
    }

    // Generate listing
    logger.info("Starting AI listing generation", { userId: user.id, model });
    const startTime = Date.now();
    const listing = await generateListing(input, model);
    const duration = Date.now() - startTime;

    // Log AI usage to database
    const tokensUsed = Math.ceil(
      (JSON.stringify(input).length + JSON.stringify(listing).length) / 4,
    );
    const cost = estimateCost(
      tokensUsed,
      model || "anthropic/claude-3.5-sonnet",
    );

    await supabase.from("ai_generations").insert({
      user_id: user.id,
      model: model || "anthropic/claude-3.5-sonnet",
      operation_type: "listing_generation",
      input_data: input,
      output_data: listing,
      tokens_used: tokensUsed,
      cost,
      duration_ms: duration,
      success: true,
    });

    logger.info("AI listing generation completed", {
      userId: user.id,
      tokensUsed,
      cost,
      duration,
    });

    return NextResponse.json({
      success: true,
      data: listing,
      metadata: {
        tokensUsed,
        cost,
        duration,
      },
    });
  } catch (error: unknown) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      logger.warn("Validation error in AI generation", {
        field: error.field,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 },
      );
    }

    logger.errorWithStack(
      "Error in generate-listing API",
      error instanceof Error ? error : new Error(String(error)),
      {
        input: request.method,
      },
    );

    // Log failed attempt
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("ai_generations").insert({
          user_id: user.id,
          model: "anthropic/claude-3.5-sonnet",
          operation_type: "listing_generation",
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (logError) {
      logger.error("Error logging AI generation failure", {
        error: String(logError),
      });
    }

    return NextResponse.json(
      { error: "Failed to generate listing. Please try again." },
      { status: 500 },
    );
  }
}

// Apply middleware: Rate limiting -> Logging (CSRF disabled for authenticated AI routes)
export const POST = withRateLimit(
  withLogging(handler),
  RATE_LIMITS.AI_GENERATE,
  "ai-generate",
);
