import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getMarketplaceColor(marketplace: string): string {
  const colors: Record<string, string> = {
    poshmark: "bg-red-500",
    mercari: "bg-blue-500",
    ebay: "bg-yellow-500",
    flyp: "bg-teal-500",
  };
  return colors[marketplace] || "bg-gray-500";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-500",
    processing: "bg-blue-500",
    published: "bg-green-500",
    failed: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
}

export function formatCondition(condition: string): string {
  const formatted: Record<string, string> = {
    new: "New",
    like_new: "Like New",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };
  return formatted[condition] || condition;
}
