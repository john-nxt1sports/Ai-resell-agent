/**
 * Analytics Event Logging System
 *
 * This module provides utilities for logging analytics events to the database.
 * All events are logged asynchronously to avoid blocking the UI.
 *
 * Usage:
 * ```typescript
 * await logEvent({
 *   userId: user.id,
 *   eventType: 'view',
 *   listingId: listing.id,
 *   marketplace: 'poshmark'
 * });
 * ```
 */

import { createClient } from "@/lib/supabase/client";

export type EventType =
  | "listing_created"
  | "listing_published"
  | "listing_updated"
  | "listing_deleted"
  | "view"
  | "like"
  | "share"
  | "sale"
  | "message"
  | "offer_received"
  | "offer_accepted";

export type Marketplace = "ebay" | "poshmark" | "mercari" | "all";

export interface AnalyticsEvent {
  userId: string;
  eventType: EventType;
  listingId?: string;
  marketplaceListingId?: string;
  marketplace?: Marketplace;
  eventValue?: number; // For sales, offers, etc.
  metadata?: Record<string, any>; // Additional flexible data
}

export interface EventLogResult {
  success: boolean;
  error?: string;
  eventId?: string;
}

/**
 * Log a single analytics event
 */
export async function logEvent(event: AnalyticsEvent): Promise<EventLogResult> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: event.userId,
        event_type: event.eventType,
        listing_id: event.listingId || null,
        marketplace_listing_id: event.marketplaceListingId || null,
        marketplace: event.marketplace || null,
        event_value: event.eventValue || null,
        metadata: event.metadata || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log analytics event:", error);
      return { success: false, error: error.message };
    }

    return { success: true, eventId: data.id };
  } catch (error: any) {
    console.error("Error logging analytics event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Log multiple analytics events in batch
 */
export async function logEventsBatch(
  events: AnalyticsEvent[]
): Promise<EventLogResult> {
  try {
    const supabase = createClient();

    const eventsData = events.map((event) => ({
      user_id: event.userId,
      event_type: event.eventType,
      listing_id: event.listingId || null,
      marketplace_listing_id: event.marketplaceListingId || null,
      marketplace: event.marketplace || null,
      event_value: event.eventValue || null,
      metadata: event.metadata || null,
    }));

    const { error } = await supabase
      .from("analytics_events")
      .insert(eventsData);

    if (error) {
      console.error("Failed to log analytics events batch:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error logging analytics events batch:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Log a view event
 */
export async function logView(
  userId: string,
  listingId: string,
  marketplace?: Marketplace
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "view",
    listingId,
    marketplace,
  });
}

/**
 * Helper: Log a like event
 */
export async function logLike(
  userId: string,
  listingId: string,
  marketplace?: Marketplace
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "like",
    listingId,
    marketplace,
  });
}

/**
 * Helper: Log a share event
 */
export async function logShare(
  userId: string,
  listingId: string,
  marketplace?: Marketplace,
  shareTo?: string
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "share",
    listingId,
    marketplace,
    metadata: shareTo ? { share_to: shareTo } : undefined,
  });
}

/**
 * Helper: Log a sale event
 */
export async function logSale(
  userId: string,
  listingId: string,
  salePrice: number,
  marketplace: Marketplace,
  metadata?: Record<string, any>
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "sale",
    listingId,
    marketplace,
    eventValue: salePrice,
    metadata,
  });
}

/**
 * Helper: Log listing creation
 */
export async function logListingCreated(
  userId: string,
  listingId: string,
  metadata?: Record<string, any>
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "listing_created",
    listingId,
    metadata,
  });
}

/**
 * Helper: Log listing publication to marketplaces
 */
export async function logListingPublished(
  userId: string,
  listingId: string,
  marketplaces: Marketplace[],
  metadata?: Record<string, any>
): Promise<EventLogResult> {
  // Log one event per marketplace
  const events = marketplaces.map((marketplace) => ({
    userId,
    eventType: "listing_published" as EventType,
    listingId,
    marketplace,
    metadata,
  }));

  return logEventsBatch(events);
}

/**
 * Helper: Log an offer received
 */
export async function logOfferReceived(
  userId: string,
  listingId: string,
  offerAmount: number,
  marketplace: Marketplace,
  metadata?: Record<string, any>
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "offer_received",
    listingId,
    marketplace,
    eventValue: offerAmount,
    metadata,
  });
}

/**
 * Helper: Log an offer accepted
 */
export async function logOfferAccepted(
  userId: string,
  listingId: string,
  offerAmount: number,
  marketplace: Marketplace,
  metadata?: Record<string, any>
): Promise<EventLogResult> {
  return logEvent({
    userId,
    eventType: "offer_accepted",
    listingId,
    marketplace,
    eventValue: offerAmount,
    metadata,
  });
}

/**
 * Queue for offline event logging
 * Stores events in localStorage when offline and syncs when back online
 */
class EventQueue {
  private readonly QUEUE_KEY = "analytics_event_queue";
  private isProcessing = false;

  /**
   * Add event to queue
   */
  add(event: AnalyticsEvent): void {
    try {
      const queue = this.getQueue();
      queue.push({ event, timestamp: Date.now() });
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to add event to queue:", error);
    }
  }

  /**
   * Get current queue
   */
  private getQueue(): Array<{ event: AnalyticsEvent; timestamp: number }> {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error("Failed to get event queue:", error);
      return [];
    }
  }

  /**
   * Process queued events
   */
  async process(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const queue = this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Process events in batches of 50
      const batchSize = 50;
      for (let i = 0; i < queue.length; i += batchSize) {
        const batch = queue.slice(i, i + batchSize).map((item) => item.event);
        const result = await logEventsBatch(batch);

        if (!result.success) {
          console.error("Failed to process event batch:", result.error);
          // Keep failed events in queue
          break;
        }
      }

      // Clear successfully processed events
      localStorage.removeItem(this.QUEUE_KEY);
    } catch (error) {
      console.error("Error processing event queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.getQueue().length;
  }
}

// Singleton instance
export const eventQueue = new EventQueue();

// Auto-process queue when back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("Back online - processing queued analytics events");
    eventQueue.process();
  });
}

/**
 * Log event with offline support
 * If online, logs immediately. If offline, queues for later.
 */
export async function logEventWithQueue(
  event: AnalyticsEvent
): Promise<EventLogResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    eventQueue.add(event);
    return { success: true };
  }

  const result = await logEvent(event);

  if (!result.success) {
    // If failed due to network, queue it
    eventQueue.add(event);
  }

  return result;
}
