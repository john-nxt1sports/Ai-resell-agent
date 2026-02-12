/**
 * Session Storage Module (2026 Best Practices)
 * Handles storing and retrieving encrypted marketplace sessions
 */

import { createClient } from "@/services/supabase/server";
import {
  encryptSessionData,
  decryptSessionData,
  generateSecureToken,
} from "./encryption";

export interface MarketplaceSession {
  id?: string;
  user_id: string;
  marketplace: string;
  encrypted_cookies: string;
  encrypted_storage: string;
  browser_profile_id: string;
  last_validated_at?: Date;
  expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface SessionData {
  marketplace: string;
  cookies: unknown[];
  localStorage: Record<string, unknown>;
  sessionStorage: Record<string, unknown>;
  isLoggedIn: boolean;
  timestamp: string;
  userAgent: string;
}

/**
 * Store or update marketplace session
 */
export async function storeSession(
  userId: string,
  sessionData: SessionData,
): Promise<{ success: boolean; browserProfileId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Encrypt cookies and storage separately
    const encryptedCookies = encryptSessionData(sessionData.cookies);
    const encryptedStorage = encryptSessionData({
      localStorage: sessionData.localStorage,
      sessionStorage: sessionData.sessionStorage,
      userAgent: sessionData.userAgent,
    });

    // Generate or retrieve browser profile ID
    const { data: existingSession } = await supabase
      .from("user_marketplace_sessions")
      .select("browser_profile_id")
      .eq("user_id", userId)
      .eq("marketplace", sessionData.marketplace)
      .single();

    const browserProfileId =
      existingSession?.browser_profile_id ||
      `bp_${sessionData.marketplace}_${generateSecureToken(16)}`;

    // Calculate expiration (sessions valid for 7 days by default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Upsert session
    const { error } = await supabase
      .from("user_marketplace_sessions")
      .upsert(
        {
          user_id: userId,
          marketplace: sessionData.marketplace,
          encrypted_cookies: encryptedCookies,
          encrypted_storage: encryptedStorage,
          browser_profile_id: browserProfileId,
          last_validated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: "user_id,marketplace",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("[SessionStorage] Error storing session:", error);
      return { success: false, error: error.message };
    }

    console.log(
      `[SessionStorage] ✅ Session stored for ${sessionData.marketplace}`,
    );

    return {
      success: true,
      browserProfileId,
    };
  } catch (error: unknown) {
    console.error("[SessionStorage] Store error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retrieve and decrypt marketplace session
 */
export async function getSession(
  userId: string,
  marketplace: string,
): Promise<{ success: boolean; session?: SessionData; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_marketplace_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("marketplace", marketplace)
      .single();

    if (error || !data) {
      return { success: false, error: "Session not found" };
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: "Session expired" };
    }

    // Decrypt data
    const cookies = decryptSessionData(data.encrypted_cookies) as unknown[];
    const storage = decryptSessionData(data.encrypted_storage) as {
      localStorage: Record<string, unknown>;
      sessionStorage: Record<string, unknown>;
      userAgent: string;
    };

    return {
      success: true,
      session: {
        marketplace: data.marketplace,
        cookies,
        localStorage: storage.localStorage,
        sessionStorage: storage.sessionStorage,
        isLoggedIn: true,
        timestamp: data.last_validated_at,
        userAgent: storage.userAgent,
      },
    };
  } catch (error: unknown) {
    console.error("[SessionStorage] Get error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all sessions for a user
 */
export async function getAllSessions(userId: string): Promise<{
  success: boolean;
  sessions?: Array<{
    marketplace: string;
    browserProfileId: string;
    lastValidated: Date;
    expiresAt: Date;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_marketplace_sessions")
      .select("marketplace, browser_profile_id, last_validated_at, expires_at")
      .eq("user_id", userId)
      .order("last_validated_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const sessions = (data || []).map((session) => ({
      marketplace: session.marketplace,
      browserProfileId: session.browser_profile_id,
      lastValidated: new Date(session.last_validated_at),
      expiresAt: new Date(session.expires_at),
    }));

    return { success: true, sessions };
  } catch (error: unknown) {
    console.error("[SessionStorage] GetAll error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a marketplace session
 */
export async function deleteSession(
  userId: string,
  marketplace: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_marketplace_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("marketplace", marketplace);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[SessionStorage] Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate session (check if still valid and not expired)
 */
export async function validateSession(
  userId: string,
  marketplace: string,
): Promise<{ success: boolean; isValid: boolean; error?: string }> {
  try {
    const result = await getSession(userId, marketplace);

    if (!result.success) {
      return { success: true, isValid: false };
    }

    // Session exists and is not expired
    return { success: true, isValid: true };
  } catch (error: unknown) {
    console.error("[SessionStorage] Validate error:", error);
    return {
      success: false,
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update last validated timestamp
 */
export async function touchSession(
  userId: string,
  marketplace: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_marketplace_sessions")
      .update({
        last_validated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("marketplace", marketplace);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[SessionStorage] Touch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
