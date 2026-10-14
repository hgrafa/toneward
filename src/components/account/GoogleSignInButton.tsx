import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/AuthContext";
import { createNonce, loadGoogleIdentity } from "@/lib/googleIdentity";
import { cn } from "@/lib/utils";
import { GoogleMark } from "./GoogleMark";

const GOOGLE_MAX_WIDTH = 400;

interface Props {
	mode: "signIn" | "register";
	/** Styling for the redirect fallback, so it matches the card's primary button. */
	className: string;
	onError: (message: string) => void;
}

/**
 * Google's own button when `VITE_GOOGLE_CLIENT_ID` is set: the ID token comes straight back to
 * this site, so Google's consent screen names Toneward instead of the Supabase project domain.
 * Falls back to the Supabase redirect when the client ID is missing or Google's script fails.
 */
export function GoogleSignInButton({ mode, className, onError }: Props) {
	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
	const [unavailable, setUnavailable] = useState(false);

	if (!clientId || unavailable)
		return <GoogleRedirectButton className={className} />;
	return (
		<GoogleIdentityButton
			clientId={clientId}
			mode={mode}
			onError={onError}
			onUnavailable={() => setUnavailable(true)}
		/>
	);
}

function GoogleIdentityButton({
	clientId,
	mode,
	onError,
	onUnavailable,
}: {
	clientId: string;
	mode: Props["mode"];
	onError: Props["onError"];
	onUnavailable: () => void;
}) {
	const { i18n } = useTranslation();
	const { signInWithGoogleCredential } = useAuth();
	const slot = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	const [busy, setBusy] = useState(false);

	const handleCredential = useEffectEvent(
		async (credential: string, nonce: string) => {
			setBusy(true);
			const { error } = await signInWithGoogleCredential(credential, nonce);
			// On success the auth listener swaps the card to the profile; nothing to reset.
			if (error) {
				setBusy(false);
				onError(error.message);
			}
		},
	);
	const handleUnavailable = useEffectEvent(onUnavailable);

	useEffect(() => {
		let cancelled = false;
		Promise.all([loadGoogleIdentity(), createNonce()])
			.then(([google, { nonce, hashed }]) => {
				const el = slot.current;
				if (cancelled || !el) return;
				google.initialize({
					client_id: clientId,
					nonce: hashed,
					context: mode === "register" ? "signup" : "signin",
					itp_support: true,
					callback: ({ credential }) => handleCredential(credential, nonce),
				});
				el.replaceChildren();
				google.renderButton(el, {
					type: "standard",
					theme: "filled_black",
					size: "large",
					text: "continue_with",
					shape: "pill",
					logo_alignment: "center",
					width: Math.min(GOOGLE_MAX_WIDTH, el.offsetWidth || GOOGLE_MAX_WIDTH),
					locale: i18n.language,
				});
				setReady(true);
			})
			.catch(() => {
				if (!cancelled) handleUnavailable();
			});
		return () => {
			cancelled = true;
		};
	}, [clientId, mode, i18n.language]);

	return (
		<div className="relative flex min-h-11 w-full justify-center">
			<div
				ref={slot}
				className={cn(
					"flex w-full max-w-[400px] justify-center transition-opacity",
					busy && "pointer-events-none opacity-40",
				)}
			/>
			{(!ready || busy) && (
				<div className="absolute inset-0 flex items-center justify-center">
					{busy ? (
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					) : (
						<div className="h-11 w-full max-w-[400px] animate-pulse rounded-full bg-muted" />
					)}
				</div>
			)}
		</div>
	);
}

/** Full-page redirect through Supabase; used on preview deploys and when Google's script is blocked. */
function GoogleRedirectButton({ className }: { className: string }) {
	const { t } = useTranslation();
	const { signInWithGoogle } = useAuth();
	const [redirecting, setRedirecting] = useState(false);

	// Coming back from Google with the Back button restores this page from bfcache.
	useEffect(() => {
		const reset = () => setRedirecting(false);
		window.addEventListener("pageshow", reset);
		return () => window.removeEventListener("pageshow", reset);
	}, []);

	async function handleClick() {
		setRedirecting(true);
		if (!(await signInWithGoogle())) setRedirecting(false);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={redirecting}
			className={className}
		>
			{redirecting ? (
				<Loader2 className="size-5 animate-spin" />
			) : (
				<GoogleMark className="size-5" />
			)}
			{t(
				redirecting
					? "ui.account.redirecting"
					: "ui.account.continueWithGoogle",
			)}
		</button>
	);
}
