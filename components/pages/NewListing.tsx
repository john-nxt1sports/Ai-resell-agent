"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FileUploader } from "../ui/FileUploader";
import { MarketplaceSelector } from "../ui/MarketplaceSelector";
import { useListingStore } from "@/store/listingStore";
import { useRouter } from "next/navigation";
import { UploadedImage, Marketplace } from "@/types";
import Link from "next/link";
import {
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ImagePlus,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { useGenerateListing, useAnalyzeImages } from "@/lib/ai";
import { uploadImages } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const AI_STYLES = [
  {
    id: "professional",
    name: "Professional",
    description:
      "Formal and detailed descriptions with technical specifications",
    example:
      "Premium quality item in excellent condition. Features authentic materials and expert craftsmanship. Perfect for collectors and enthusiasts.",
  },
  {
    id: "casual",
    name: "Casual & Friendly",
    description: "Conversational tone that's approachable and engaging",
    example:
      "Super cute and comfy! This has been one of my favorites. Barely worn and still looks brand new. You're gonna love it!",
  },
  {
    id: "luxury",
    name: "Luxury & Premium",
    description: "Sophisticated language emphasizing exclusivity and quality",
    example:
      "Exquisite piece showcasing timeless elegance. Meticulously maintained and authenticated. A distinguished addition to any curated collection.",
  },
  {
    id: "minimal",
    name: "Short & Simple",
    description: "Concise descriptions focusing on key details only",
    example: "Like new condition. Size M. Ships fast. No flaws.",
  },
];

export function NewListing() {
  const router = useRouter();
  const { addListing } = useListingStore();

  // AI Hooks
  const {
    data: generatedListing,
    loading: generatingListing,
    error: generateError,
    execute: generateListing,
  } = useGenerateListing();
  const {
    data: imageAnalysis,
    loading: analyzingImages,
    error: analyzeError,
    execute: analyzeImages,
  } = useAnalyzeImages();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<
    Marketplace[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiStyle, setAiStyle] = useState<string | null>(null);
  const [showStyleSetup, setShowStyleSetup] = useState(true);
  const [typewriterText, setTypewriterText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [hasSeenTypewriter, setHasSeenTypewriter] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<
    "select" | "ai-generate" | "manual"
  >("select");

  const supabase = useMemo(() => createClient(), []);

  const welcomeMessage =
    "Hi! 👋 I'm your AI listing assistant. Before we create your first listing, let's personalize how I write descriptions for you. Choose a style that matches your brand and target audience. You can always change this later!";

  // Check if typewriter has been seen this session
  useEffect(() => {
    const seen = sessionStorage.getItem("listing-typewriter-seen");
    if (seen === "true") {
      setHasSeenTypewriter(true);
      setTypewriterText(welcomeMessage);
      setIsTyping(false);
    }
  }, []);

  // Typewriter effect for first-time setup (only once per session)
  useEffect(() => {
    if (aiStyle === null && isTyping && !hasSeenTypewriter) {
      let index = 0;
      const timer = setInterval(() => {
        if (index <= welcomeMessage.length) {
          setTypewriterText(welcomeMessage.slice(0, index));
          index++;
        } else {
          setIsTyping(false);
          sessionStorage.setItem("listing-typewriter-seen", "true");
          setHasSeenTypewriter(true);
          clearInterval(timer);
        }
      }, 30);

      return () => clearInterval(timer);
    }
  }, [aiStyle, isTyping, hasSeenTypewriter]);

  const handleStyleSelect = (styleId: string) => {
    setAiStyle(styleId);
    // In production, save this to user preferences/database
    localStorage.setItem("ai-listing-style", styleId);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching user:", error);
          setAuthError(
            "We couldn't verify your session. Please sign in again.",
          );
          setCurrentUser(null);
        } else {
          setCurrentUser(data.user ?? null);
          setAuthError(null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching user:", error);
        setAuthError("We couldn't verify your session. Please sign in again.");
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Apply generated listing data
  useEffect(() => {
    if (generatedListing) {
      setAiGeneratedData(generatedListing);
      setTitle(generatedListing.title);
      setDescription(generatedListing.description);
      if (generatedListing.suggestedPrice) {
        setPrice(generatedListing.suggestedPrice.toString());
      }
    }
  }, [generatedListing]);

  // Apply image analysis data
  useEffect(() => {
    if (imageAnalysis) {
      if (!category && imageAnalysis.suggestedCategory) {
        setCategory(imageAnalysis.suggestedCategory);
      }
      if (!condition && imageAnalysis.suggestedCondition) {
        setCondition(imageAnalysis.suggestedCondition);
      }
      if (!brand && imageAnalysis.suggestedBrand) {
        setBrand(imageAnalysis.suggestedBrand);
      }
    }
  }, [imageAnalysis]);

  const handleUploadAndAnalyzeImages = useCallback(
    async (activeUser?: SupabaseUser | null) => {
      if (images.length === 0 || uploadingImages) return;

      setUploadingImages(true);

      try {
        const userToUse = activeUser ?? currentUser;

        if (!userToUse) {
          setAuthError("You must be signed in to upload images.");
          setUploadingImages(false);
          return;
        }

        // Convert base64 previews to File objects if needed
        const imageFiles: File[] = [];

        for (const img of images) {
          if (img.file) {
            imageFiles.push(img.file);
          }
        }

        if (imageFiles.length === 0) {
          console.error("No image files to upload");
          setUploadingImages(false);
          return;
        }

        // Upload images to Supabase Storage
        const uploadResults = await uploadImages(imageFiles, userToUse.id);
        const imageUrls = uploadResults.map((result) => result.url);

        setAuthError(null);
        setUploadedImageUrls(imageUrls);

        // Analyze uploaded images with AI
        await analyzeImages(imageUrls);
      } catch (error) {
        console.error("Error uploading/analyzing images:", error);
      } finally {
        setUploadingImages(false);
      }
    },
    [images, uploadingImages, currentUser, analyzeImages],
  );

  // Auto-upload and analyze images when uploaded
  useEffect(() => {
    if (isLoadingUser || !currentUser) return;
    if (images.length === 0) return;
    if (uploadingImages) return;
    if (uploadedImageUrls.length > 0) return;

    handleUploadAndAnalyzeImages(currentUser);
  }, [
    images,
    currentUser,
    uploadedImageUrls.length,
    uploadingImages,
    isLoadingUser,
    handleUploadAndAnalyzeImages,
  ]);

  const handleImagesChange = (newImages: UploadedImage[]) => {
    setImages(newImages);
    setUploadedImageUrls([]);
  };

  const handleGenerateWithAI = async () => {
    if (!category || !condition) {
      alert(
        "Please provide at least Category and Condition to generate with AI",
      );
      return;
    }

    await generateListing({
      title: title || undefined,
      description: description || undefined,
      category,
      condition,
      price: price ? parseFloat(price) : undefined,
      brand: brand || undefined,
      additionalDetails: aiStyle
        ? `Writing style: ${AI_STYLES.find((s) => s.id === aiStyle)?.name}`
        : undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !title ||
      !price ||
      images.length === 0 ||
      selectedMarketplaces.length === 0
    ) {
      alert(
        "Please fill in all required fields (title, price, images, and at least one marketplace)",
      );
      return;
    }

    if (isLoadingUser) {
      alert("Please wait while we verify your account...");
      return;
    }

    if (!currentUser) {
      alert("Please sign in to post a listing.");
      router.push("/auth/login");
      return;
    }

    setIsProcessing(true);

    try {
      // Use uploaded URLs if available, otherwise use preview URLs
      const imageUrls =
        uploadedImageUrls.length > 0
          ? uploadedImageUrls
          : images.map((img) => img.preview);

      // Ensure condition is properly formatted
      const validCondition =
        condition && condition.trim() !== "" ? condition : undefined;

      // Save to database via Zustand store
      const result = await addListing(currentUser.id, {
        title,
        description: description || undefined,
        price: parseFloat(price),
        category: category || undefined,
        condition: validCondition as any,
        brand: brand || undefined,
        tags: aiGeneratedData?.tags || undefined,
        images: imageUrls,
        marketplaces: selectedMarketplaces,
        status: "published",
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create listing");
      }

      setIsProcessing(false);

      // Queue automated posting to selected marketplaces
      if (selectedMarketplaces.length > 0) {
        try {
          const marketplaceIds =
            typeof selectedMarketplaces[0] === "string"
              ? selectedMarketplaces
              : selectedMarketplaces.map((m: any) =>
                  typeof m === "string" ? m : m.id,
                );

          const response = await fetch("/api/automation/queue-listing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listingId: result.listingId,
              marketplaces: marketplaceIds,
            }),
          });

          const queueResult = await response.json();

          if (queueResult.success) {
            alert(
              `🎉 Listing created and queued for ${selectedMarketplaces.length} marketplace(s)! Check your dashboard for posting status.`,
            );
          } else {
            alert(
              "⚠️ Listing created but automation failed. You may need to connect your marketplace accounts in Settings.",
            );
          }
        } catch (automationError) {
          console.error("Automation error:", automationError);
          alert(
            "⚠️ Listing created but couldn't queue automation. Please try posting from your dashboard.",
          );
        }
      } else {
        alert("🎉 Your listing has been posted successfully to the database!");
      }

      router.push("/dashboard");
    } catch (error: any) {
      setIsProcessing(false);
      console.error("Error creating listing:", error);
      alert(
        `Failed to create listing: ${
          error.message || "Unknown error"
        }. Please try again.`,
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          Create New Listing
        </h1>
        <p className="text-dark-600 dark:text-dark-400">
          Upload photos, add price, and let AI do the rest!
        </p>
      </div>

      {/* AI Style Setup Section */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl border border-primary-200 dark:border-primary-800 overflow-hidden">
        <button
          onClick={() => setShowStyleSetup(!showStyleSetup)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-dark-900/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                AI Description Style
              </h2>
              <p className="text-sm text-dark-600 dark:text-dark-400">
                {aiStyle
                  ? `Current: ${AI_STYLES.find((s) => s.id === aiStyle)?.name}`
                  : "Not configured yet"}
              </p>
            </div>
          </div>
          {showStyleSetup ? (
            <ChevronUp className="h-5 w-5 text-dark-600 dark:text-dark-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-dark-600 dark:text-dark-400" />
          )}
        </button>

        {showStyleSetup && (
          <div className="px-6 pb-6 space-y-4">
            {/* Typewriter Message for First Time */}
            {aiStyle === null && (
              <div className="bg-white dark:bg-dark-900 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
                <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                  {typewriterText}
                  {isTyping && !hasSeenTypewriter && (
                    <span className="inline-block w-0.5 h-4 bg-primary-500 ml-1 animate-pulse" />
                  )}
                </p>
              </div>
            )}

            {/* Style Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AI_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    aiStyle === style.id
                      ? "border-primary-500 bg-white dark:bg-dark-900 shadow-lg"
                      : "border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 hover:border-primary-300 dark:hover:border-primary-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                        {style.name}
                        {aiStyle === style.id && (
                          <Check className="h-4 w-4 text-primary-500" />
                        )}
                      </h3>
                      <p className="text-xs text-dark-600 dark:text-dark-400 mt-1">
                        {style.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-dark-50 dark:bg-dark-800 rounded text-xs text-dark-600 dark:text-dark-400 italic">
                    "{style.example}"
                  </div>
                </button>
              ))}
            </div>

            {/* Save Confirmation */}
            {aiStyle && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                <Check className="h-4 w-4" />
                <span>
                  Style saved! Your AI descriptions will use the "
                  {AI_STYLES.find((s) => s.id === aiStyle)?.name}" style.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
          {uploadMode === "select" ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                  Product Photos
                </h2>
                <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                  Choose how you want to add your product images
                </p>
              </div>

              {/* Two Box Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Generate Option */}
                <button
                  type="button"
                  onClick={() => setUploadMode("ai-generate")}
                  className="group relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 bg-gradient-to-br from-primary-50/50 to-purple-50/50 dark:from-primary-900/20 dark:to-purple-900/20 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 min-h-[280px]"
                >
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full">
                      Recommended
                    </span>
                  </div>

                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-dark-900 dark:text-dark-50 mb-2 text-center">
                    AI-Generated Listing
                  </h3>

                  <p className="text-sm text-dark-500 dark:text-dark-400 text-center mb-4 max-w-[240px]">
                    Drop in a few raw photos and our AI will automatically
                    create professional listing images
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full">
                      Auto-enhance
                    </span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                      Background removal
                    </span>
                    <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-full">
                      Pro layouts
                    </span>
                  </div>
                </button>

                {/* Manual Upload Option */}
                <button
                  type="button"
                  onClick={() => setUploadMode("manual")}
                  className="group flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 bg-dark-50/50 dark:bg-dark-800/50 hover:border-dark-400 dark:hover:border-dark-500 hover:bg-dark-100/50 dark:hover:bg-dark-800 transition-all duration-300 min-h-[280px]"
                >
                  <div className="h-16 w-16 rounded-2xl bg-dark-200 dark:bg-dark-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="h-8 w-8 text-dark-500 dark:text-dark-400" />
                  </div>

                  <h3 className="text-xl font-bold text-dark-900 dark:text-dark-50 mb-2 text-center">
                    Manual Upload
                  </h3>

                  <p className="text-sm text-dark-500 dark:text-dark-400 text-center mb-4 max-w-[240px]">
                    Upload your own pre-edited photos directly without AI
                    processing
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 rounded-full">
                      Full control
                    </span>
                    <span className="px-2 py-1 bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 rounded-full">
                      Use existing images
                    </span>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Back button and header when mode is selected */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode("select");
                      setImages([]);
                      setUploadedImageUrls([]);
                    }}
                    aria-label="Go back to upload mode selection"
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-dark-500 dark:text-dark-400" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                      {uploadMode === "ai-generate" ? (
                        <>
                          <Sparkles className="h-5 w-5 text-primary-500" />
                          AI-Generated Listing Photos
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-dark-500" />
                          Manual Upload
                        </>
                      )}
                    </h2>
                    <p className="text-xs text-dark-500 dark:text-dark-400">
                      {uploadMode === "ai-generate"
                        ? "Upload raw photos and AI will create professional listing images"
                        : "Upload your pre-edited listing photos"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadingImages && (
                    <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {uploadMode === "ai-generate"
                          ? "Processing with AI..."
                          : "Uploading..."}
                      </span>
                    </div>
                  )}
                  {uploadedImageUrls.length > 0 && !uploadingImages && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span>Images ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Generate Mode Banner */}
              {uploadMode === "ai-generate" && (
                <div className="mb-4 p-3 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-900 dark:text-dark-100">
                        AI will automatically enhance your photos
                      </p>
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                        Upload 2-5 photos from different angles. Our AI will
                        remove backgrounds, adjust lighting, and create
                        professional marketplace-ready images.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FileUploader
                images={images}
                onImagesChange={handleImagesChange}
              />

              {authError && !isLoadingUser && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {authError}{" "}
                  <Link
                    href="/auth/login"
                    className="font-medium underline underline-offset-4"
                  >
                    Sign in
                  </Link>{" "}
                  to continue.
                </div>
              )}
            </>
          )}
        </div>

        {/* Title & Price */}
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Listing Details
          </h2>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Vintage Nike Air Jordan 1 Retro High OG"
              className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Shoes, Electronics, Clothing"
                className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                Condition
              </label>
              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                Brand (Optional)
              </label>
              <input
                type="text"
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Nike, Apple, Zara"
                className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
              >
                Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500">
                  $
                </span>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item... or let AI generate it for you!"
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* AI Generation Button */}
          <div className="flex items-center justify-between pt-4 border-t border-dark-200 dark:border-dark-800">
            <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
              <Sparkles className="h-4 w-4" />
              <span>Let AI optimize your listing</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generatingListing || !category || !condition}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingListing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </button>
          </div>

          {/* AI Generation Errors */}
          {generateError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {generateError}
            </div>
          )}
          {analyzeError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              Image analysis error: {analyzeError}
            </div>
          )}

          {/* AI Generated Data Display */}
          {aiGeneratedData && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <Check className="h-4 w-4" />
                <span>AI-Generated Content Applied!</span>
              </div>
              {aiGeneratedData.tags && aiGeneratedData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiGeneratedData.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Marketplace Selection */}
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4">
            Select Marketplaces
          </h2>
          <MarketplaceSelector
            selected={selectedMarketplaces}
            onChange={setSelectedMarketplaces}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI is posting your listing...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              One Click Post with AI
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <p className="text-sm text-primary-900 dark:text-primary-300">
          <strong>💡 Pro Tip:</strong> Just add your title, price, and images.
          Our AI will handle everything else! Descriptions, tags, and
          marketplace formatting are all automated.
        </p>
      </div>
    </div>
  );
}
