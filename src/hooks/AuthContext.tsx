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

const redirectUrl = () =>
	`${window.location.origin}${window.location.pathname}`;

export interface AuthFailure {
	/** Supabase error code (e.g. `invalid_credentials`), used to pick a translated message. */
	code?: string;
	message: string;
}

export interface AuthResult {
	error: AuthFailure | null;
	/** Sign-up succeeded but the account must be confirmed from the email link first. */
	confirmEmail?: boolean;
}

const failure = (error: { code?: string; message: string } | null) =>
	error ? { code: error.code, message: error.message } : null;

interface AuthState {
	/** False when the Supabase env vars are missing; accounts are then hidden. */
	configured: boolean;
	loading: boolean;
	user: User | null;
	error: string | null;
	/** True after following a password-reset link, until a new password is saved. */
	recovering: boolean;
	/** Resolves `true` once the browser is being redirected to Google. */
	signInWithGoogle: () => Promise<boolean>;
	/** Exchanges a Google Identity Services ID token (and its raw nonce) for a session. */
	signInWithGoogleCredential: (
		credential: string,
		nonce: string,
	) => Promise<AuthResult>;
	signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
	signUp: (
		name: string,
		email: string,
		password: string,
	) => Promise<AuthResult>;
	sendPasswordReset: (email: string) => Promise<AuthResult>;
	updatePassword: (password: string) => Promise<AuthResult>;
	signOut: () => Promise<void>;
}

const NOT_CONFIGURED: AuthResult = {
	error: { message: "Sign-in is not configured." },
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(supabase !== null);
	const [error, setError] = useState<string | null>(readRedirectError);
	const [recovering, setRecovering] = useState(false);

	useEffect(() => {
		if (readRedirectError()) clearRedirectError();
	}, []);

	useEffect(() => {
		if (!supabase) return;
		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
			if (event === "PASSWORD_RECOVERY") setRecovering(true);
			if (event === "SIGNED_OUT") setRecovering(false);
		});
		return () => data.subscription.unsubscribe();
	}, []);

	const signInWithGoogle = useCallback(async () => {
		if (!supabase) return false;
		setError(null);
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: redirectUrl() },
		});
		if (error) setError(error.message);
		return !error;
	}, []);

	const signInWithGoogleCredential = useCallback(
		async (credential: string, nonce: string) => {
			if (!supabase) return NOT_CONFIGURED;
			setError(null);
			const { error } = await supabase.auth.signInWithIdToken({
				provider: "google",
				token: credential,
				nonce,
			});
			return { error: failure(error) };
		},
		[],
	);

	const signInWithPassword = useCallback(
		async (email: string, password: string) => {
			if (!supabase) return NOT_CONFIGURED;
			setError(null);
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			return { error: failure(error) };
		},
		[],
	);

	const signUp = useCallback(
		async (name: string, email: string, password: string) => {
			if (!supabase) return NOT_CONFIGURED;
			setError(null);
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: redirectUrl(),
					data: name ? { full_name: name } : undefined,
				},
			});
			if (error) return { error: failure(error) };
			return { error: null, confirmEmail: !data.session };
		},
		[],
	);

	const sendPasswordReset = useCallback(async (email: string) => {
		if (!supabase) return NOT_CONFIGURED;
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: redirectUrl(),
		});
		return { error: failure(error) };
	}, []);

	const updatePassword = useCallback(async (password: string) => {
		if (!supabase) return NOT_CONFIGURED;
		const { error } = await supabase.auth.updateUser({ password });
		if (!error) setRecovering(false);
		return { error: failure(error) };
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
			recovering,
			signInWithGoogle,
			signInWithGoogleCredential,
			signInWithPassword,
			signUp,
			sendPasswordReset,
			updatePassword,
			signOut,
		}),
		[
			loading,
			user,
			error,
			recovering,
			signInWithGoogle,
			signInWithGoogleCredential,
			signInWithPassword,
			signUp,
			sendPasswordReset,
			updatePassword,
			signOut,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}
