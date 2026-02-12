"use client";

import { useState, useEffect } from "react";
import { MarketplaceSelector } from "../ui/MarketplaceSelector";
import { BulkItemCard } from "../ui/BulkItemCard";
import { useListingStore } from "@/store/listingStore";
import { useRouter } from "next/navigation";
import { Marketplace } from "@/types";
import { BulkListingItem } from "@/types/bulk";
import { Sparkles, Plus, Upload as UploadIcon, Loader2 } from "lucide-react";
import { useGenerateBulk } from "@/services/ai";
import { createClient } from "@/services/supabase/client";

export function BulkListing() {
  const router = useRouter();
  const { addListing } = useListingStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // AI Hook
  const {
    loading: generatingBulk,
    error: generateError,
    execute: generateBulk,
  } = useGenerateBulk();

  const [bulkItems, setBulkItems] = useState<BulkListingItem[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<
    Marketplace[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoGenerateAI, setAutoGenerateAI] = useState(true);

  // Load saved auto-generate AI preference
  useEffect(() => {
    const saved = localStorage.getItem("auto-generate-ai");
    if (saved !== null) {
      setAutoGenerateAI(saved === "true");
    }
  }, []);

  // Save auto-generate AI preference
  const handleToggleAutoGenerateAI = (enabled: boolean) => {
    setAutoGenerateAI(enabled);
    localStorage.setItem("auto-generate-ai", String(enabled));
  };

  // Auto-trigger AI generation when toggle is on and items have images but need generation
  useEffect(() => {
    if (autoGenerateAI && !generatingBulk) {
      const itemsNeedingGeneration = bulkItems.filter(
        (item) => item.images.length > 0 && (!item.title || item.price === 0),
      );
      if (itemsNeedingGeneration.length > 0) {
        handleGenerateAllWithAI();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerateAI, bulkItems]);

  const handleAddNewItem = () => {
    const newItem: BulkListingItem = {
      id: Math.random().toString(36).substring(7),
      title: "",
      price: 0,
      images: [],
      tempImages: [],
      status: "pending",
    };
    setBulkItems([...bulkItems, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<BulkListingItem>) => {
    setBulkItems((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              status: validateItem({ ...item, ...updates }),
            }
          : item,
      ),
    );
  };

  const handleRemoveItem = (id: string) => {
    setBulkItems((items) => items.filter((item) => item.id !== id));
  };

  const validateItem = (
    item: BulkListingItem,
  ): "ready" | "pending" | "error" => {
    if (!item.title || item.price <= 0 || item.images.length === 0) {
      return "pending";
    }
    return "ready";
  };

  const handleGenerateAllWithAI = async () => {
    // Only generate for items with images but missing data
    const itemsToGenerate = bulkItems.filter(
      (item) => item.images.length > 0 && (!item.title || item.price === 0),
    );

    if (itemsToGenerate.length === 0) {
      return;
    }

    // Prepare inputs for AI
    const inputs = itemsToGenerate.map((item) => ({
      category: "General",
      condition: "Good",
      images: item.images,
    }));

    try {
      const results = await generateBulk(inputs);

      if (results) {
        // Apply AI results to items
        setBulkItems((prevItems) =>
          prevItems.map((item) => {
            const index = itemsToGenerate.findIndex((i) => i.id === item.id);
            if (index !== -1 && results[index]) {
              return {
                ...item,
                title: results[index].title,
                price: results[index].suggestedPrice || 0,
                status: validateItem({
                  ...item,
                  title: results[index].title,
                  price: results[index].suggestedPrice || 0,
                }),
              };
            }
            return item;
          }),
        );
      }
    } catch (error) {
      console.error("Bulk generation error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const readyItems = bulkItems.filter((item) => item.status === "ready");

    if (readyItems.length === 0) {
      alert("Please complete at least one listing before submitting");
      return;
    }

    if (selectedMarketplaces.length === 0) {
      alert("Please select at least one marketplace");
      return;
    }

    if (!userId) {
      alert("Please log in to create listings");
      return;
    }

    setIsProcessing(true);

    // Process each item
    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];

      // Simulate delay for each item
      await new Promise((resolve) => setTimeout(resolve, 500));

      addListing(userId, {
        title: item.title,
        price: item.price,
        images: item.images,
        marketplaces: selectedMarketplaces,
        status: "processing",
      });
    }

    // Simulate successful posting
    setTimeout(() => {
      setIsProcessing(false);
      alert(`🎉 Successfully posted ${readyItems.length} listings!`);
      router.push("/");
    }, 1000);
  };

  const readyCount = bulkItems.filter((item) => item.status === "ready").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          Bulk Create Listings
        </h1>
        <p className="text-dark-600 dark:text-dark-400">
          Upload multiple products at once and let AI handle the rest!
        </p>
      </div>

      {/* Stats Bar */}
      {bulkItems.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  Total Items
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                  {bulkItems.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  Ready to Post
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {readyCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {bulkItems.length - readyCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Add Item Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddNewItem}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Manual Item
          </button>
        </div>

        {/* Listing Items Grid */}
        {bulkItems.length > 0 && (
          <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                Listing Items ({bulkItems.length})
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Auto-generate with AI</span>
                </div>
                {generatingBulk && (
                  <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </div>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoGenerateAI}
                  onClick={() => handleToggleAutoGenerateAI(!autoGenerateAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    autoGenerateAI
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : "bg-dark-300 dark:bg-dark-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      autoGenerateAI ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {generateError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {generateError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bulkItems.map((item) => (
                <BulkItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Marketplace Selection */}
        {bulkItems.length > 0 && (
          <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4">
              Select Marketplaces for All Items
            </h2>
            <MarketplaceSelector
              selected={selectedMarketplaces}
              onChange={setSelectedMarketplaces}
            />
          </div>
        )}

        {/* Submit Button */}
        {bulkItems.length > 0 && (
          <button
            type="submit"
            disabled={isProcessing || readyCount === 0}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI is posting {readyCount} listing{readyCount !== 1 ? "s" : ""}
                ...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Create & Post {readyCount} Listing{readyCount !== 1 ? "s" : ""}{" "}
                with AI
              </>
            )}
          </button>
        )}
      </form>

      {/* Empty State */}
      {bulkItems.length === 0 && (
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                <UploadIcon className="h-10 w-10 text-primary-500" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
              No items yet
            </h3>
            <p className="text-dark-600 dark:text-dark-400 max-w-md mx-auto">
              Start by uploading product photos or manually adding items. You
              can add as many as you need and post them all at once!
            </p>
            <button
              type="button"
              onClick={handleAddNewItem}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Your First Item
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <p className="text-sm text-primary-900 dark:text-primary-300">
          <strong>💡 Pro Tip:</strong> Upload all your product photos at once,
          then fill in the titles and prices. Our AI will automatically generate
          descriptions and optimize each listing for all selected marketplaces.
        </p>
      </div>
    </div>
  );
}
