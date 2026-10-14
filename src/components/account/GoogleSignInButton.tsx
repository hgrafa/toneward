import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/AuthContext";
import { GoogleMark } from "./GoogleMark";

/** Full-page redirect to Google (no popup); `useAuth` finishes the sign-in on the way back. */
export function GoogleSignInButton({ className }: { className: string }) {
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
