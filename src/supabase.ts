import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseReady = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url, key)
  : null;
