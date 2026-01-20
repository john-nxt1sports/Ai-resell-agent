/**
 * Marketplace Connections Component
 * Allows users to connect their marketplace accounts for automation
 */

"use client";

import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { Check, X, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { MarketplaceIcon } from "../ui/MarketplaceIcon";

interface MarketplaceCredential {
  id: string;
  marketplace: string;
  email?: string;
  username?: string;
  is_active: boolean;
  last_used?: string;
  created_at: string;
}

interface MarketplaceConfig {
  id: string;
  name: string;
  requiresEmail: boolean;
  requiresUsername: boolean;
  helpText: string;
}

const MARKETPLACES: MarketplaceConfig[] = [
  {
    id: "poshmark",
    name: "Poshmark",
    requiresEmail: false,
    requiresUsername: true,
    helpText: "Enter your Poshmark username and password",
  },
  {
    id: "mercari",
    name: "Mercari",
    requiresEmail: true,
    requiresUsername: false,
    helpText: "Enter your Mercari email and password",
  },
  {
    id: "ebay",
    name: "eBay",
    requiresEmail: true,
    requiresUsername: false,
    helpText: "Enter your eBay email and password",
  },
  {
    id: "depop",
    name: "Depop",
    requiresEmail: true,
    requiresUsername: false,
    helpText: "Enter your Depop email and password",
  },
];

export function MarketplaceConnections() {
  const [credentials, setCredentials] = useState<MarketplaceCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch("/api/automation/credentials");
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarketplace = (marketplaceId: string) => {
    setSelectedMarketplace(marketplaceId);
    setFormData({ email: "", username: "", password: "" });
    setError(null);
    setShowAddModal(true);
  };

  const [cookieInput, setCookieInput] = useState("");
  const [showCookieHelper, setShowCookieHelper] = useState(false);

  const handleSaveCookies = async () => {
    if (!selectedMarketplace || !cookieInput.trim()) {
      setError("Please paste your cookies");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Save cookies via API
      const response = await fetch("/api/automation/save-cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace: selectedMarketplace,
          cookies: cookieInput,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save cookies");
      }

      // Refresh credentials
      await fetchCredentials();

      // Close modal
      setShowAddModal(false);
      setSelectedMarketplace(null);
      setCookieInput("");
      setSubmitting(false);
    } catch (error: any) {
      setError(error.message);
      setSubmitting(false);
    }
  };

  const getCookieInstructions = (marketplace: string) => {
    const urls: Record<string, string> = {
      mercari: "https://www.mercari.com",
      poshmark: "https://poshmark.com",
      ebay: "https://www.ebay.com",
      depop: "https://www.depop.com",
    };

    return {
      url: urls[marketplace.toLowerCase()],
      steps: [
        `Open ${marketplace} in a new tab and make sure you're logged in`,
        "Press F12 (Windows) or Cmd+Option+I (Mac) to open Developer Tools",
        "Go to the 'Application' tab (or 'Storage' in Firefox)",
        "Click 'Cookies' in the left sidebar",
        `Click on the ${marketplace} domain`,
        "Copy ALL cookies (we'll provide a helper script)",
        "Paste them in the box below",
      ],
    };
  };

  const handleDelete = async (credentialId: string) => {
    if (!confirm("Are you sure you want to disconnect this marketplace?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/automation/credentials?id=${credentialId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete credentials");
      }

      // Refresh credentials
      await fetchCredentials();
    } catch (error) {
      console.error("Failed to delete credentials:", error);
      alert("Failed to disconnect marketplace");
    }
  };

  const getMarketplaceConfig = (id: string) => {
    return MARKETPLACES.find((m) => m.id === id);
  };

  const isMarketplaceConnected = (marketplaceId: string) => {
    return credentials.some((c) => c.marketplace === marketplaceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          Marketplace Connections
        </h2>
        <p className="text-dark-600 dark:text-dark-400 mt-2">
          Connect your marketplace accounts to enable automated listing posting
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-300">
          <p className="font-medium mb-1">Your credentials are secure</p>
          <p>
            All passwords are encrypted before storage and are never displayed.
            We use industry-standard encryption to protect your account
            information.
          </p>
        </div>
      </div>

      {/* Connected Marketplaces */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
          Connected Accounts
        </h3>

        {credentials.length === 0 ? (
          <div className="bg-dark-50 dark:bg-dark-900 rounded-lg p-8 text-center">
            <p className="text-dark-600 dark:text-dark-400">
              No marketplaces connected yet. Connect your first marketplace
              below to enable automated posting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentials.map((credential) => {
              const config = getMarketplaceConfig(credential.marketplace);
              if (!config) return null;

              return (
                <div
                  key={credential.id}
                  className="bg-white dark:bg-dark-900 rounded-lg border border-dark-200 dark:border-dark-800 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MarketplaceIcon
                        marketplace={credential.marketplace as any}
                        className="h-10 w-10"
                      />
                      <div>
                        <h4 className="font-semibold text-dark-900 dark:text-dark-50">
                          {config.name}
                        </h4>
                        <p className="text-sm text-dark-600 dark:text-dark-400">
                          {credential.email || credential.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {credential.is_active ? (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(credential.id)}
                        className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-dark-600 dark:text-dark-400" />
                      </button>
                    </div>
                  </div>
                  {credential.last_used && (
                    <p className="text-xs text-dark-500 dark:text-dark-500 mt-2">
                      Last used:{" "}
                      {new Date(credential.last_used).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Marketplaces */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
          Available Marketplaces
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MARKETPLACES.map((marketplace) => {
            const isConnected = isMarketplaceConnected(marketplace.id);

            return (
              <div
                key={marketplace.id}
                className="bg-white dark:bg-dark-900 rounded-lg border border-dark-200 dark:border-dark-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <MarketplaceIcon
                      marketplace={marketplace.id as any}
                      className="h-10 w-10"
                    />
                    <div>
                      <h4 className="font-semibold text-dark-900 dark:text-dark-50">
                        {marketplace.name}
                      </h4>
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        {marketplace.helpText}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  {isConnected ? (
                    <button
                      onClick={() => handleAddMarketplace(marketplace.id)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Update credentials
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMarketplace(marketplace.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal - Cookie Copy/Paste Method */}
      {showAddModal && selectedMarketplace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-dark-900 rounded-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-dark-900 dark:text-dark-50 mb-4">
              Connect {getMarketplaceConfig(selectedMarketplace)?.name}
            </h3>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🍪</span>
                  Copy Your Browser Cookies
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                  Follow these steps to securely connect your{" "}
                  {getMarketplaceConfig(selectedMarketplace)?.name} account:
                </p>
                <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-2 list-decimal list-inside">
                  {getCookieInstructions(selectedMarketplace).steps.map(
                    (step, i) => (
                      <li key={i} className="pl-2">
                        {step}
                      </li>
                    )
                  )}
                </ol>
              </div>

              {/* Quick Open Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() =>
                    window.open(
                      getCookieInstructions(selectedMarketplace).url,
                      "_blank"
                    )
                  }
                  variant="outline"
                  className="flex-1"
                >
                  Open {getMarketplaceConfig(selectedMarketplace)?.name} →
                </Button>
                <Button
                  onClick={() => setShowCookieHelper(!showCookieHelper)}
                  variant="outline"
                  className="flex-1"
                >
                  {showCookieHelper ? "Hide" : "Show"} Cookie Helper Script
                </Button>
              </div>

              {/* Cookie Helper Script */}
              {showCookieHelper && (
                <div className="bg-dark-900 dark:bg-dark-950 rounded-lg p-4 border border-dark-700">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-dark-400 mb-2 font-semibold">
                        📋 Method 1: Auto-Copy (Recommended)
                      </p>
                      <p className="text-xs text-dark-400 mb-2">
                        Paste this in Console tab (F12 → Console), then press
                        Enter:
                      </p>
                      <code className="text-xs text-green-400 block bg-dark-800 p-3 rounded overflow-x-auto whitespace-pre">
                        {`copy(JSON.stringify(
  document.cookie.split(';').map(c => {
    const [name, value] = c.trim().split('=');
    return { name, value, domain: location.hostname };
  })
));
console.log('✅ Cookies copied! Paste below with Cmd+V');`}
                      </code>
                      <p className="text-xs text-green-400 mt-2">
                        ✅ After running this, press{" "}
                        <kbd className="px-2 py-1 bg-dark-700 rounded">
                          Cmd+V
                        </kbd>{" "}
                        in the textarea below
                      </p>
                    </div>

                    <div className="border-t border-dark-700 pt-3">
                      <p className="text-xs text-dark-400 mb-2 font-semibold">
                        📝 Method 2: Manual Copy
                      </p>
                      <p className="text-xs text-dark-400 mb-2">
                        Run this to see your cookies, then copy the output:
                      </p>
                      <code className="text-xs text-yellow-400 block bg-dark-800 p-3 rounded overflow-x-auto whitespace-pre">
                        {`console.log(JSON.stringify(
  document.cookie.split(';').map(c => {
    const [name, value] = c.trim().split('=');
    return { name, value, domain: location.hostname };
  })
));`}
                      </code>
                      <p className="text-xs text-dark-400 mt-2">
                        Select the output, copy it, and paste in the textarea
                        below
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cookie Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300">
                    Paste Your Cookies Here:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Auto-convert raw cookie string to JSON
                      if (cookieInput && !cookieInput.trim().startsWith("[")) {
                        try {
                          const converted = JSON.stringify(
                            cookieInput
                              .split(";")
                              .map((c) => {
                                const [name, value] = c.trim().split("=");
                                return {
                                  name: name?.trim(),
                                  value: value?.trim(),
                                  domain: `.${selectedMarketplace?.toLowerCase()}.com`,
                                };
                              })
                              .filter((c) => c.name && c.value)
                          );
                          setCookieInput(converted);
                        } catch (e) {
                          setError(
                            "Failed to convert cookies. Please use the helper script."
                          );
                        }
                      }
                    }}
                    className="text-xs px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors"
                  >
                    Convert to JSON
                  </button>
                </div>
                <textarea
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="Paste cookies here (raw string or JSON array)"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">
                  💡 Pasted raw cookies? Click "Convert to JSON" button above
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-900 dark:text-green-300">
                  🔒 <strong>Your cookies are encrypted</strong> before storage
                  and never exposed.
                  <br />
                  ✅ Works with any login method (Google, Facebook, email)
                  <br />
                  ✅ No passwords needed - only session cookies
                  <br />
                  ⏱️ Sessions expire naturally (usually 30-90 days)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setCookieInput("");
                    setShowCookieHelper(false);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCookies}
                  disabled={submitting || !cookieInput.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Connect Account"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
