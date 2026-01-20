/**
 * AI Listing Generation API Route
 * POST /api/ai/generate-listing
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateListing, estimateCost } from "@/lib/ai/service";
import { ListingGenerationInput, AIModel } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { input, model } = body as {
      input: ListingGenerationInput;
      model?: AIModel;
    };

    if (!input) {
      return NextResponse.json(
        { error: "Missing input data" },
        { status: 400 }
      );
    }

    // Generate listing
    const startTime = Date.now();
    const listing = await generateListing(input, model);
    const duration = Date.now() - startTime;

    // Log AI usage to database
    const tokensUsed = Math.ceil(
      (JSON.stringify(input).length + JSON.stringify(listing).length) / 4
    );
    const cost = estimateCost(
      tokensUsed,
      model || "anthropic/claude-3.5-sonnet"
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

    return NextResponse.json({
      success: true,
      data: listing,
      metadata: {
        tokensUsed,
        cost,
        duration,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-listing API:", error);

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
          error_message: error.message,
        });
      }
    } catch (logError) {
      console.error("Error logging failure:", logError);
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate listing" },
      { status: 500 }
    );
  }
}
