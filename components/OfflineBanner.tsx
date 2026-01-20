"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

/**
 * Offline indicator banner - shows when user loses internet connection
 * Displays at the top of the viewport with a warning message
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2.5 text-center text-sm font-medium shadow-lg"
    >
      <span className="inline-flex items-center justify-center gap-2">
        {/* Wifi Off Icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
          {/* Diagonal line to show "off" */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M1 1l22 22"
          />
        </svg>
        <span>
          You&apos;re offline. Some features may not work until you reconnect.
        </span>
      </span>
    </div>
  );
}
