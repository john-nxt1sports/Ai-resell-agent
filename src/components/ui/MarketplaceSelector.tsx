"use client";

import { Marketplace } from "@/types";
import { Check } from "lucide-react";
import { MarketplaceIcon } from "./MarketplaceIcon";

const marketplaces: {
  id: Marketplace;
  name: string;
  color: string;
  description?: string;
}[] = [
  { id: "poshmark", name: "Poshmark", color: "bg-red-500" },
  { id: "mercari", name: "Mercari", color: "bg-blue-500" },
  { id: "ebay", name: "eBay", color: "bg-yellow-500" },
  {
    id: "flyp",
    name: "Flyp",
    color: "bg-teal-500",
    description: "Crosslist to all platforms (saved as draft)",
  },
];

interface MarketplaceSelectorProps {
  selected: Marketplace[];
  onChange: (selected: Marketplace[]) => void;
}

export function MarketplaceSelector({
  selected,
  onChange,
}: MarketplaceSelectorProps) {
  const toggleMarketplace = (id: Marketplace) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  // Separate individual marketplaces from crosslisters
  const individualMarketplaces = marketplaces.filter((m) => m.id !== "flyp");
  const crosslisters = marketplaces.filter((m) => m.id === "flyp");

  return (
    <div className="space-y-4">
      {/* Individual Marketplaces */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {individualMarketplaces.map((marketplace) => {
          const isSelected = selected.includes(marketplace.id);
          return (
            <button
              key={marketplace.id}
              type="button"
              onClick={() => toggleMarketplace(marketplace.id)}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-dark-300 dark:border-dark-700 hover:border-dark-400 dark:hover:border-dark-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white dark:bg-white rounded-lg flex items-center justify-center overflow-hidden p-2 shadow-sm">
                    <MarketplaceIcon
                      marketplace={marketplace.id}
                      size={32}
                      className="object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                      {marketplace.name}
                    </h3>
                    <p className="text-sm text-dark-600 dark:text-dark-400">
                      {isSelected ? "Selected" : "Click to select"}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-3 right-3 h-6 w-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Flyp Crosslister — full-width card with description */}
      {crosslisters.map((marketplace) => {
        const isSelected = selected.includes(marketplace.id);
        return (
          <button
            key={marketplace.id}
            type="button"
            onClick={() => toggleMarketplace(marketplace.id)}
            className={`relative w-full p-6 rounded-lg border-2 transition-all ${
              isSelected
                ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                : "border-dark-300 dark:border-dark-700 hover:border-dark-400 dark:hover:border-dark-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-white dark:bg-white rounded-lg flex items-center justify-center overflow-hidden p-2 shadow-sm">
                  <MarketplaceIcon
                    marketplace={marketplace.id}
                    size={32}
                    className="object-contain"
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                    {marketplace.name}
                    <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                      Crosslister
                    </span>
                  </h3>
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {marketplace.description ??
                      (isSelected ? "Selected" : "Click to select")}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 h-6 w-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-teal-200 dark:border-teal-800">
                <p className="text-xs text-teal-700 dark:text-teal-400">
                  Item will be saved as a draft on Flyp for your review before
                  listing to connected marketplaces.
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
