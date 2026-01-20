/**
 * AI Listing Optimization API Route
 * POST /api/ai/optimize-listing
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { optimizeListing, estimateCost } from "@/lib/ai/service";
import { AIModel } from "@/lib/ai/types";

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
    const { title, description, marketplace, model } = body as {
      title: string;
      description: string;
      marketplace: "ebay" | "poshmark" | "mercari";
      model?: AIModel;
    };

    if (!title || !description || !marketplace) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, marketplace" },
        { status: 400 }
      );
    }

    // Optimize listing
    const startTime = Date.now();
    const optimized = await optimizeListing(
      title,
      description,
      marketplace,
      model
    );
    const duration = Date.now() - startTime;

    // Calculate tokens and cost
    const tokensUsed = Math.ceil(
      (title.length + description.length + JSON.stringify(optimized).length) / 4
    );
    const cost = estimateCost(
      tokensUsed,
      model || "anthropic/claude-3.5-sonnet"
    );

    // Log AI usage
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      model: model || "anthropic/claude-3.5-sonnet",
      operation_type: "optimization",
      input_data: { title, marketplace },
      output_data: optimized,
      tokens_used: tokensUsed,
      cost,
      duration_ms: duration,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: optimized,
      metadata: {
        tokensUsed,
        cost,
        duration,
      },
    });
  } catch (error: any) {
    console.error("Error in optimize-listing API:", error);

    return NextResponse.json(
      { error: error.message || "Failed to optimize listing" },
      { status: 500 }
    );
  }
}
