import type { User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { supabase } from "@/lib/supabase";

const REDIRECT_ERROR_PARAMS = ["error", "error_code", "error_description"];

// Supabase reports a failed OAuth round-trip in the query string or the hash.
function readRedirectError(): string | null {
	const search = new URLSearchParams(window.location.search);
	const hash = new URLSearchParams(window.location.hash.slice(1));
	return (
		search.get("error_description") ??
		hash.get("error_description") ??
		search.get("error") ??
		hash.get("error")
	);
}

function clearRedirectError() {
	const url = new URL(window.location.href);
	for (const key of REDIRECT_ERROR_PARAMS) url.searchParams.delete(key);
	url.hash = "";
	window.history.replaceState(window.history.state, "", url);
}

interface AuthState {
	/** False when the Supabase env vars are missing; accounts are then hidden. */
	configured: boolean;
	loading: boolean;
	user: User | null;
	error: string | null;
	/** Resolves `true` once the browser is being redirected to Google. */
	signInWithGoogle: () => Promise<boolean>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(supabase !== null);
	const [error, setError] = useState<string | null>(readRedirectError);

	useEffect(() => {
		if (readRedirectError()) clearRedirectError();
	}, []);

	useEffect(() => {
		if (!supabase) return;
		const { data } = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
		});
		return () => data.subscription.unsubscribe();
	}, []);

	const signInWithGoogle = useCallback(async () => {
		if (!supabase) return false;
		setError(null);
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}${window.location.pathname}`,
			},
		});
		if (error) setError(error.message);
		return !error;
	}, []);

	const signOut = useCallback(async () => {
		if (!supabase) return;
		setError(null);
		const { error } = await supabase.auth.signOut();
		if (error) setError(error.message);
	}, []);

	const value = useMemo<AuthState>(
		() => ({
			configured: supabase !== null,
			loading,
			user,
			error,
			signInWithGoogle,
			signOut,
		}),
		[loading, user, error, signInWithGoogle, signOut],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}
