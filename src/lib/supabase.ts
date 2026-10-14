import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// `null` when the env vars are missing: the app must keep working without accounts.
export const supabase: SupabaseClient | null =
	url && publishableKey
		? createClient(url, publishableKey, {
				auth: { flowType: "pkce", storageKey: "toneward.auth" },
			})
		: null;
