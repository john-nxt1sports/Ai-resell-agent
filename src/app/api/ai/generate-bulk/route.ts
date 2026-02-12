/**
 * AI Bulk Listing Generation API Route
 * POST /api/ai/generate-bulk
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { generateBulkListings, estimateCost } from "@/services/ai/service";
import { ListingGenerationInput, AIModel } from "@/services/ai/types";

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
    const { inputs, model } = body as {
      inputs: ListingGenerationInput[];
      model?: AIModel;
    };

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid inputs array" },
        { status: 400 },
      );
    }

    // Limit to 50 items per request
    if (inputs.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 items per bulk request" },
        { status: 400 },
      );
    }

    // Generate listings
    const startTime = Date.now();
    const listings = await generateBulkListings(inputs, model);
    const duration = Date.now() - startTime;

    // Calculate total tokens and cost
    const totalTokens = Math.ceil(
      (JSON.stringify(inputs).length + JSON.stringify(listings).length) / 4,
    );
    const cost = estimateCost(
      totalTokens,
      model || "anthropic/claude-3.5-sonnet",
    );

    // Log AI usage
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      model: model || "anthropic/claude-3.5-sonnet",
      operation_type: "bulk_generation",
      input_data: { count: inputs.length },
      output_data: { count: listings.length },
      tokens_used: totalTokens,
      cost,
      duration_ms: duration,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: listings,
      metadata: {
        itemsProcessed: listings.length,
        tokensUsed: totalTokens,
        cost,
        duration,
      },
    });
  } catch (error: unknown) {
    console.error("Error in generate-bulk API:", error);

    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to generate bulk listings",
      },
      { status: 500 },
    );
  }
}
