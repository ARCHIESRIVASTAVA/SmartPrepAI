import { createClient } from "@supabase/supabase-js";

/*
  Accounts are optional. Without these two env vars the app runs in
  guest mode and keeps progress in this browser only. The anon key is
  public by design; Row Level Security protects each user's row.
*/

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const authEnabled = Boolean(url && key);

export const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH === "true";

export const supabase = authEnabled
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
