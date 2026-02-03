import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ziqhurgzuqallbjflavt.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcWh1cmd6dXFhbGxiamZsYXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NjA3MjQsImV4cCI6MjA3NjAzNjcyNH0.wHmNZUf6QAXHsCIqrhukNoTwnipexgBzAvE99PSIQyg";

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
