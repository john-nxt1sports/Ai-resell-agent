import { createBrowserClient } from "@supabase/ssr";

// Placeholder values that satisfy @supabase/ssr's non-empty validation.
// API calls will fail gracefully at the network level instead of crashing the app.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

let supabaseWarned = false;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

  if (
    (supabaseUrl === PLACEHOLDER_URL || supabaseAnonKey === PLACEHOLDER_KEY) &&
    !supabaseWarned
  ) {
    supabaseWarned = true;
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
        "Database calls will fail until these are configured.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
