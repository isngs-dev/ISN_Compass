import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client for use in Client Components
 * (realtime subscriptions, optimistic UI, etc.). Still RLS-bound.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
