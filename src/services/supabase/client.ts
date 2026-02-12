import { createBrowserClient } from "@supabase/ssr";

let supabaseWarned = false;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if ((!supabaseUrl || !supabaseAnonKey) && !supabaseWarned) {
    supabaseWarned = true;
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
        "Database calls will fail until these are configured.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
