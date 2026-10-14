const GSI_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleCredentialResponse {
	/** The Google ID token (JWT). */
	credential: string;
}

export interface GoogleIdApi {
	initialize(config: {
		client_id: string;
		callback: (response: GoogleCredentialResponse) => void;
		/** Embedded in the ID token; Supabase compares it against the raw nonce. */
		nonce?: string;
		context?: "signin" | "signup" | "use";
		itp_support?: boolean;
	}): void;
	renderButton(
		parent: HTMLElement,
		options: {
			type?: "standard" | "icon";
			theme?: "outline" | "filled_blue" | "filled_black";
			size?: "large" | "medium" | "small";
			text?: "signin_with" | "signup_with" | "continue_with" | "signin";
			shape?: "rectangular" | "pill" | "circle" | "square";
			logo_alignment?: "left" | "center";
			/** In px; Google caps it at 400. */
			width?: number;
			locale?: string;
		},
	): void;
}

declare global {
	interface Window {
		google?: { accounts?: { id?: GoogleIdApi } };
	}
}

let loading: Promise<GoogleIdApi> | null = null;

/** Loads Google Identity Services once; rejects if the script is blocked or fails. */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
	const ready = window.google?.accounts?.id;
	if (ready) return Promise.resolve(ready);
	loading ??= new Promise<GoogleIdApi>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = GSI_SRC;
		script.async = true;
		script.onload = () => {
			const api = window.google?.accounts?.id;
			if (api) resolve(api);
			else reject(new Error("Google Identity Services is unavailable."));
		};
		script.onerror = () => {
			loading = null;
			reject(new Error("Couldn't load Google sign-in."));
		};
		document.head.append(script);
	});
	return loading;
}

/** A raw nonce for Supabase and its SHA-256 hex digest for Google. */
export async function createNonce(): Promise<{
	nonce: string;
	hashed: string;
}> {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	const nonce = btoa(String.fromCharCode(...bytes));
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(nonce),
	);
	const hashed = Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, "0"),
	).join("");
	return { nonce, hashed };
}
