"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

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
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true, // SSR snapshot
  );
}

export interface NetworkStatus {
  /** Whether the browser currently has network connectivity */
  isOnline: boolean;
  /** Whether the user was offline at some point during this session */
  wasOffline: boolean;
  /** Whether the user just came back online after being offline */
  justReconnected: boolean;
  /** Call this after showing a \"reconnected\" message to reset the flag */
  acknowledgeReconnection: () => void;
}

/**
 * Enhanced network status hook with reconnection detection.
 * Useful for showing \"You're back online!\" messages.
 *
 * @returns NetworkStatus object with status and utilities
 *
 * @example
 * const { isOnline, justReconnected, acknowledgeReconnection } = useNetworkStatus();
 *
 * useEffect(() => {
 *   if (justReconnected) {
 *     toast.success(\"You're back online!\");
 *     acknowledgeReconnection();
 *   }
 * }, [justReconnected]);
 */
export function useNetworkStatus(): NetworkStatus {
  const [wasOffline, setWasOffline] = useState(false);

  // Track online status and set wasOffline via subscription callbacks (not effects)
  const isOnline = useSyncExternalStore(
    (callback) => {
      const handleOnline = () => callback();
      const handleOffline = () => {
        setWasOffline(true);
        callback();
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    },
    () => navigator.onLine,
    () => true,
  );

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
