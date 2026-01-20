/**
 * useExtension Hook
 * Manages Chrome extension connection state and marketplace statuses
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  checkExtensionStatus,
  getMarketplaceStatuses,
  queueListingsForExtension,
  getPendingJobs,
  processNextJob,
  onExtensionEvent,
  ExtensionStatus,
  ExtensionMarketplaces,
  ListingJob,
} from "../extension-bridge";

export interface UseExtensionReturn {
  // Extension status
  extensionStatus: ExtensionStatus;
  isExtensionInstalled: boolean;
  isExtensionConnected: boolean;

  // Marketplace statuses
  marketplaces: ExtensionMarketplaces;
  isLoadingMarketplaces: boolean;

  // Jobs
  pendingJobs: ListingJob[];
  isProcessing: boolean;

  // Actions
  refreshStatus: () => Promise<ExtensionStatus | undefined>;
  refreshMarketplaces: () => Promise<void>;
  queueListings: (
    listings: any[],
    marketplaces: string[],
  ) => Promise<{ success: boolean; error?: string }>;
  startProcessing: () => Promise<void>;

  // Helpers
  isMarketplaceConnected: (marketplace: string) => boolean;
  getConnectedMarketplaces: () => string[];
}

export function useExtension(): UseExtensionReturn {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    installed: false,
    connected: false,
  });
  const [marketplaces, setMarketplaces] = useState<ExtensionMarketplaces>({});
  const [isLoadingMarketplaces, setIsLoadingMarketplaces] = useState(true);
  const [pendingJobs, setPendingJobs] = useState<ListingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check extension status
  const refreshStatus = useCallback(async () => {
    try {
      const status = await checkExtensionStatus();
      setExtensionStatus(status);
      return status;
    } catch (error) {
      console.error("Failed to check extension status:", error);
      setExtensionStatus({ installed: false, connected: false });
    }
  }, []);

  // Get marketplace statuses
  const refreshMarketplaces = useCallback(async () => {
    setIsLoadingMarketplaces(true);
    try {
      const statuses = await getMarketplaceStatuses();
      setMarketplaces(statuses);
    } catch (error) {
      console.error("Failed to get marketplace statuses:", error);
    } finally {
      setIsLoadingMarketplaces(false);
    }
  }, []);

  // Queue listings for posting
  const queueListings = useCallback(
    async (listings: any[], selectedMarketplaces: string[]) => {
      try {
        const result = await queueListingsForExtension(
          listings,
          selectedMarketplaces,
        );
        if (result.success) {
          // Refresh pending jobs
          const jobs = await getPendingJobs();
          setPendingJobs(jobs);
        }
        return result;
      } catch (error: any) {
        console.error("Failed to queue listings:", error);
        return { success: false, error: error.message };
      }
    },
    [],
  );

  // Start processing jobs
  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    try {
      await processNextJob();
      // Refresh pending jobs
      const jobs = await getPendingJobs();
      setPendingJobs(jobs);
    } catch (error) {
      console.error("Failed to process job:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Helper: Check if a marketplace is connected
  const isMarketplaceConnected = useCallback(
    (marketplace: string) => {
      const status = marketplaces[marketplace as keyof ExtensionMarketplaces];
      return status?.isLoggedIn || false;
    },
    [marketplaces],
  );

  // Helper: Get list of connected marketplaces
  const getConnectedMarketplaces = useCallback(() => {
    return Object.entries(marketplaces)
      .filter(([_, status]) => status?.isLoggedIn)
      .map(([marketplace]) => marketplace);
  }, [marketplaces]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const status = await refreshStatus();
      if (status?.connected) {
        await refreshMarketplaces();
        const jobs = await getPendingJobs();
        setPendingJobs(jobs);
      } else {
        setIsLoadingMarketplaces(false);
      }
    };

    init();
  }, [refreshStatus, refreshMarketplaces]);

  // Listen for extension events
  useEffect(() => {
    const unsubscribe = onExtensionEvent((event) => {
      console.log("Extension event:", event);

      if (
        event.type === "LISTING_COMPLETED" ||
        event.type === "LISTING_FAILED"
      ) {
        // Refresh jobs on completion/failure
        getPendingJobs().then(setPendingJobs);
      }
    });

    return unsubscribe;
  }, []);

  return {
    extensionStatus,
    isExtensionInstalled: extensionStatus.installed,
    isExtensionConnected: extensionStatus.connected,
    marketplaces,
    isLoadingMarketplaces,
    pendingJobs,
    isProcessing,
    refreshStatus,
    refreshMarketplaces,
    queueListings,
    startProcessing,
    isMarketplaceConnected,
    getConnectedMarketplaces,
  };
}
