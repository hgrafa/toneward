const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STORAGE_KEY = "toneward.google-sign-in";

export type GoogleRedirectResult =
	| { credential: string; nonce: string }
	/** `error: null` means the user backed out on Google's screen. */
	| { error: string | null };

function randomHex(bytes: number): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");
}

async function sha256Hex(text: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");
}

/**
 * Builds Google's OpenID sign-in URL and remembers the state + raw nonce for the way back.
 * `redirectUri` must be listed exactly under the client's "Authorized redirect URIs".
 * Google gets the SHA-256 of the nonce; Supabase later gets the raw value and compares.
 */
export async function createGoogleSignInUrl(
	clientId: string,
	redirectUri: string,
): Promise<string> {
	const state = randomHex(16);
	const nonce = randomHex(32);
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state, nonce }));
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "id_token",
		scope: "openid email profile",
		nonce: await sha256Hex(nonce),
		state,
		prompt: "select_account",
	});
	return `${AUTH_ENDPOINT}?${params}`;
}

/** Google's answer in the URL hash, if this page load is the return from `createGoogleSignInUrl`. */
export function readGoogleRedirect(): GoogleRedirectResult | null {
	const hash = new URLSearchParams(window.location.hash.slice(1));
	const state = hash.get("state");
	const stored = sessionStorage.getItem(STORAGE_KEY);
	if (!state || !stored) return null;
	const saved = JSON.parse(stored) as { state: string; nonce: string };
	if (state !== saved.state) {
		return { error: "Google sign-in expired. Please try again." };
	}
	const credential = hash.get("id_token");
	if (credential) return { credential, nonce: saved.nonce };
	const error = hash.get("error");
	return { error: error === "access_denied" ? null : (error ?? "unknown") };
}

/** Drops the token from the address bar and history, and forgets the pending state. */
export function clearGoogleRedirect() {
	sessionStorage.removeItem(STORAGE_KEY);
	const url = new URL(window.location.href);
	url.hash = "";
	window.history.replaceState(window.history.state, "", url);
}
