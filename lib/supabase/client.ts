import { createBrowserClient } from "@supabase/ssr";

// Provide fallback values during build time to prevent prerender errors
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
