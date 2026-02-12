/**
 * Extension Marketplace Connections Component
 * Uses Chrome extension for marketplace connections - no credentials needed!
 */

"use client";

import { useState } from "react";
import Button from "../ui/Button";
import {
  Check,
  Loader2,
  ExternalLink,
  RefreshCw,
  Download,
  Chrome,
  CheckCircle,
  Zap,
} from "lucide-react";
import { MarketplaceIcon } from "../ui/MarketplaceIcon";
import type { Marketplace } from "@/types";
import { useExtension } from "@/hooks/useExtension";

interface MarketplaceConfig {
  id: string;
  name: string;
  loginUrl: string;
  color: string;
}

const MARKETPLACES: MarketplaceConfig[] = [
  {
    id: "poshmark",
    name: "Poshmark",
    loginUrl: "https://poshmark.com/login",
    color: "#7f0353",
  },
  {
    id: "mercari",
    name: "Mercari",
    loginUrl: "https://www.mercari.com/login",
    color: "#4dc4e8",
  },
  {
    id: "ebay",
    name: "eBay",
    loginUrl: "https://signin.ebay.com/signin",
    color: "#e53238",
  },
  {
    id: "depop",
    name: "Depop",
    loginUrl: "https://www.depop.com/login",
    color: "#ff2300",
  },
];

export function ExtensionMarketplaceConnections() {
  const {
    isExtensionInstalled,
    isLoadingMarketplaces,
    pendingJobs,
    refreshStatus,
    refreshMarketplaces,
    isMarketplaceConnected,
    getConnectedMarketplaces,
  } = useExtension();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshStatus();
    await refreshMarketplaces();
    setIsRefreshing(false);
  };

  const openMarketplaceLogin = (loginUrl: string) => {
    window.open(loginUrl, "_blank");
  };

  const connectedCount = getConnectedMarketplaces().length;
  const pendingCount = pendingJobs.filter((j) => j.status === "pending").length;

  // Extension not installed
  if (!isExtensionInstalled) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Marketplace Connections
          </h2>
          <p className="text-dark-600 dark:text-dark-400 mt-2">
            Connect your marketplace accounts to enable automated listing
            posting
          </p>
        </div>

        {/* Extension Required Notice */}
        <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/30 dark:to-purple-900/30 border border-primary-200 dark:border-primary-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-xl">
              <Chrome className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
                Install the Chrome Extension
              </h3>
              <p className="text-dark-600 dark:text-dark-400 mb-4">
                To automatically post listings to marketplaces, you need to
                install our Chrome extension. It&apos;s fast, secure, and uses
                your existing browser sessions - no passwords required!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No passwords stored</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Uses your sessions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>One-click posting</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Install Extension
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Check Again
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Install Instructions */}
        <div className="bg-dark-50 dark:bg-dark-900/50 rounded-lg p-4 border border-dark-200 dark:border-dark-800">
          <h4 className="font-medium text-dark-900 dark:text-dark-50 mb-2">
            Manual Installation (Developer Mode)
          </h4>
          <ol className="text-sm text-dark-600 dark:text-dark-400 space-y-2 list-decimal list-inside">
            <li>
              Open Chrome and go to{" "}
              <code className="px-1 py-0.5 bg-dark-200 dark:bg-dark-700 rounded">
                chrome://extensions
              </code>
            </li>
            <li>Enable &quot;Developer mode&quot; in the top right</li>
            <li>Click &quot;Load unpacked&quot;</li>
            <li>
              Select the{" "}
              <code className="px-1 py-0.5 bg-dark-200 dark:bg-dark-700 rounded">
                browser-extension
              </code>{" "}
              folder from the project
            </li>
            <li>Click the extension icon and refresh this page</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Marketplace Connections
          </h2>
          <p className="text-dark-600 dark:text-dark-400 mt-1">
            Log into your marketplaces to enable automated posting
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Extension Status */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-900 dark:text-green-300">
            Extension Connected
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            {connectedCount} marketplace{connectedCount !== 1 ? "s" : ""}{" "}
            connected
            {pendingCount > 0 && ` • ${pendingCount} jobs pending`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700 dark:text-green-400">
            Active
          </span>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              How it works
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              1. Log into each marketplace in a separate browser tab
              <br />
              2. Click &quot;Refresh&quot; to detect your sessions
              <br />
              3. Connected marketplaces will show a green checkmark
              <br />
              4. Create listings and we&apos;ll post using your existing
              sessions!
            </p>
          </div>
        </div>
      </div>

      {/* Marketplace Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MARKETPLACES.map((marketplace) => {
          const isConnected = isMarketplaceConnected(marketplace.id);
          return (
            <div
              key={marketplace.id}
              className={`
                relative bg-white dark:bg-dark-900 rounded-xl border-2 p-4 transition-all
                ${
                  isConnected
                    ? "border-green-300 dark:border-green-700"
                    : "border-dark-200 dark:border-dark-700"
                }
              `}
            >
              {/* Connected Badge */}
              {isConnected && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full">
                  <Check className="h-3 w-3" />
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      marketplace.id === "poshmark"
                        ? "bg-pink-100 dark:bg-pink-900/30"
                        : marketplace.id === "mercari"
                          ? "bg-cyan-100 dark:bg-cyan-900/30"
                          : marketplace.id === "ebay"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-orange-100 dark:bg-orange-900/30"
                    }`}
                  >
                    <MarketplaceIcon
                      marketplace={marketplace.id as Marketplace}
                      className="h-8 w-8"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                      {marketplace.name}
                    </h3>
                    <p
                      className={`text-sm ${
                        isConnected
                          ? "text-green-600 dark:text-green-400"
                          : "text-dark-500 dark:text-dark-400"
                      }`}
                    >
                      {isLoadingMarketplaces ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking...
                        </span>
                      ) : isConnected ? (
                        "Ready to post"
                      ) : (
                        "Not logged in"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {isConnected ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-500 dark:text-dark-400">
                      Session active
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openMarketplaceLogin(marketplace.loginUrl)}
                      className="text-xs"
                    >
                      Open {marketplace.name}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMarketplaceLogin(marketplace.loginUrl)}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Log in to {marketplace.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="bg-dark-50 dark:bg-dark-900/50 rounded-lg p-4 border border-dark-200 dark:border-dark-800">
        <h4 className="font-medium text-dark-900 dark:text-dark-50 mb-2">
          💡 Tips
        </h4>
        <ul className="text-sm text-dark-600 dark:text-dark-400 space-y-1">
          <li>
            • Keep your marketplace tabs open while posting for best results
          </li>
          <li>• Sessions usually last 30-90 days before requiring re-login</li>
          <li>
            • If posting fails, try logging out and back in to the marketplace
          </li>
          <li>• The extension works even after you refresh this page</li>
        </ul>
      </div>
    </div>
  );
}
