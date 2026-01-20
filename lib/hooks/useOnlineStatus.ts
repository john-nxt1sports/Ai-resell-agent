"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to detect online/offline status.
 * Returns true when the browser has network connectivity.
 *
 * @returns boolean - Current online status
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) {
 *   return <OfflineMessage />;
 * }
 */
export function useOnlineStatus(): boolean {
  // Default to true for SSR - avoids flash of offline state
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Set actual initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export interface NetworkStatus {
  /** Whether the browser currently has network connectivity */
  isOnline: boolean;
  /** Whether the user was offline at some point during this session */
  wasOffline: boolean;
  /** Whether the user just came back online after being offline */
  justReconnected: boolean;
  /** Call this after showing a "reconnected" message to reset the flag */
  acknowledgeReconnection: () => void;
}

/**
 * Enhanced network status hook with reconnection detection.
 * Useful for showing "You're back online!" messages.
 *
 * @returns NetworkStatus object with status and utilities
 *
 * @example
 * const { isOnline, justReconnected, acknowledgeReconnection } = useNetworkStatus();
 *
 * useEffect(() => {
 *   if (justReconnected) {
 *     toast.success("You're back online!");
 *     acknowledgeReconnection();
 *   }
 * }, [justReconnected]);
 */
export function useNetworkStatus(): NetworkStatus {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline]);

  const acknowledgeReconnection = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    wasOffline,
    justReconnected: wasOffline && isOnline,
    acknowledgeReconnection,
  };
}
