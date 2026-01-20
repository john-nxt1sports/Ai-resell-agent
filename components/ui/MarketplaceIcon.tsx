import Image from "next/image";
import { Marketplace } from "@/types";

interface MarketplaceIconProps {
  marketplace: Marketplace;
  className?: string;
  size?: number;
}

export function MarketplaceIcon({
  marketplace,
  className = "",
  size = 24,
}: MarketplaceIconProps) {
  const getIconPath = (marketplace: Marketplace) => {
    switch (marketplace) {
      case "poshmark":
        return "/assets/POSH.svg";
      case "mercari":
        return "/assets/MERCARI.png";
      case "ebay":
        return "/assets/EBAY.svg";
      default:
        return "";
    }
  };

  // Adjust size for specific marketplaces to better fit
  const getAdjustedSize = (marketplace: Marketplace, baseSize: number) => {
    switch (marketplace) {
      case "poshmark":
        return baseSize * 0.65; // 65% of original size
      case "mercari":
        return baseSize * 0.7; // 70% of original size
      case "ebay":
        return baseSize; // Keep original size
      default:
        return baseSize;
    }
  };

  const iconPath = getIconPath(marketplace);
  const adjustedSize = getAdjustedSize(marketplace, size);

  if (!iconPath) {
    // Fallback to first letter if no icon
    return (
      <span className={`font-bold text-white ${className}`}>
        {marketplace[0].toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={iconPath}
      alt={`${marketplace} icon`}
      width={adjustedSize}
      height={adjustedSize}
      className={className}
    />
  );
}
