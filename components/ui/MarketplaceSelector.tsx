"use client";

import { Marketplace } from "@/types";
import { Check } from "lucide-react";
import { MarketplaceIcon } from "./MarketplaceIcon";

const marketplaces: { id: Marketplace; name: string; color: string }[] = [
  { id: "poshmark", name: "Poshmark", color: "bg-red-500" },
  { id: "mercari", name: "Mercari", color: "bg-blue-500" },
  { id: "ebay", name: "eBay", color: "bg-yellow-500" },
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {marketplaces.map((marketplace) => {
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
  );
}
