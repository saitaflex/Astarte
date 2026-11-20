"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client (anon key). Used only for direct uploads to signed URLs. */
export function supabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
