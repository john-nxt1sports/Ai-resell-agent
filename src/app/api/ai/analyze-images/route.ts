/**
 * AI Image Analysis API Route
 * POST /api/ai/analyze-images
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import { analyzeImages, estimateCost } from "@/services/ai/service";
import { AIModel } from "@/services/ai/types";

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
    const { imageUrls, model } = body as {
      imageUrls: string[];
      model?: AIModel;
    };

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid image URLs" },
        { status: 400 },
      );
    }

    // Limit to 10 images per request
    if (imageUrls.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 images per request" },
        { status: 400 },
      );
    }

    // Analyze images
    const startTime = Date.now();
    const analysis = await analyzeImages(imageUrls, model);
    const duration = Date.now() - startTime;

    // Calculate tokens and cost
    const tokensUsed =
      Math.ceil(
        (JSON.stringify(imageUrls).length + JSON.stringify(analysis).length) /
          4,
      ) +
      imageUrls.length * 500; // Approximate token cost for image processing
    const cost = estimateCost(tokensUsed, model || "openai/gpt-4o");

    // Log AI usage
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      model: model || "openai/gpt-4o",
      operation_type: "image_analysis",
      input_data: { imageCount: imageUrls.length },
      output_data: analysis,
      tokens_used: tokensUsed,
      cost,
      duration_ms: duration,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        imagesAnalyzed: imageUrls.length,
        tokensUsed,
        cost,
        duration,
      },
    });
  } catch (error: unknown) {
    console.error("Error in analyze-images API:", error);

    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to analyze images",
      },
      { status: 500 },
    );
  }
}
