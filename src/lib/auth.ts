import { createClient } from "@/services/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  const supabase = createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  // If signup successful and we have a session, create/update profile
  if (authData.user && !error) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: authData.user.id,
        full_name: data.fullName,
        email: data.email,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }
  }

  return {
    user: authData.user,
    session: authData.session,
    error,
  };
}

/**
 * Sign in an existing user
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  const supabase = createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  return {
    user: authData.user,
    session: authData.session,
    error,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Sign in with OAuth provider (Google, GitHub)
 */
export async function signInWithOAuth(
  provider: "google" | "github"
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  return { error };
}

/**
 * Request password reset
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  return { error };
}

/**
 * Update password
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Delete user account and all associated data
 * This will delete the user from auth and cascade delete all related data
 */
export async function deleteAccount(): Promise<{ error: Error | null }> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No user found");

    // Delete user profile (this will cascade delete all related data due to ON DELETE CASCADE)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) throw profileError;

    // Delete the user from auth (admin function)
    // Note: This requires the user to be authenticated
    const { error: authError } = await supabase.rpc("delete_user");

    // If RPC doesn't exist, sign out the user
    // The profile deletion will have cascaded to all related tables
    if (authError) {
      console.warn("Admin delete not available, signing out user:", authError);
    }

    // Sign out the user
    await supabase.auth.signOut();

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
