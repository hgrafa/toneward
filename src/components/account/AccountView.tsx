import { GoogleLogo } from "@phosphor-icons/react";
import { Loader2, LogOut } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { displayName, UserAvatar } from "./UserAvatar";

type Mode = "signIn" | "register";
const MODES: Mode[] = ["signIn", "register"];

const PRIMARY =
	"flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-background text-sm transition-opacity hover:opacity-90 disabled:opacity-60";
const SECONDARY =
	"flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card font-semibold text-secondary-foreground text-sm transition-colors hover:bg-muted";

export function AccountView() {
	const { configured, loading, user } = useAuth();

	return (
		<div className="flex min-h-full items-center justify-center px-4 py-10">
			<div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
				{!configured ? (
					<Unavailable />
				) : loading ? (
					<div className="flex justify-center py-10">
						<Loader2 className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : user ? (
					<SignedIn />
				) : (
					<SignedOut />
				)}
			</div>
		</div>
	);
}

function SignedOut() {
	const { t } = useTranslation();
	const { signInWithGoogle, error } = useAuth();
	const { setView } = useView();
	const [mode, setMode] = useState<Mode>("signIn");
	const [redirecting, setRedirecting] = useState(false);

	// Coming back from Google with the Back button restores this page from bfcache.
	useEffect(() => {
		const reset = () => setRedirecting(false);
		window.addEventListener("pageshow", reset);
		return () => window.removeEventListener("pageshow", reset);
	}, []);

	async function handleGoogle() {
		setRedirecting(true);
		if (!(await signInWithGoogle())) setRedirecting(false);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<BrandMark />
				<fieldset
					aria-label={t("ui.account.modeLabel")}
					className="flex gap-0.5 rounded-lg bg-[#ece6dd] p-0.5"
				>
					{MODES.map((m) => (
						<button
							key={m}
							type="button"
							aria-pressed={mode === m}
							onClick={() => setMode(m)}
							className={`rounded-md px-2.5 py-1 font-medium text-xs transition-colors ${
								mode === m
									? "bg-card text-foreground shadow-sm"
									: "text-secondary-foreground hover:text-foreground"
							}`}
						>
							{t(
								m === "signIn"
									? "ui.account.signIn"
									: "ui.account.createAccount",
							)}
						</button>
					))}
				</fieldset>
			</div>

			<div className="flex flex-col gap-1.5">
				<h1 className="font-bold font-display text-2xl tracking-[-0.02em]">
					{t(
						mode === "signIn"
							? "ui.account.signInTitle"
							: "ui.account.registerTitle",
					)}
				</h1>
				<p className="text-secondary-foreground text-sm">
					{t(
						mode === "signIn"
							? "ui.account.signInSubtitle"
							: "ui.account.registerSubtitle",
					)}
				</p>
			</div>

			{error && (
				<ErrorNote>
					<p className="font-semibold">{t("ui.account.signInFailed")}</p>
					<p className="opacity-80">{error}</p>
				</ErrorNote>
			)}

			<button
				type="button"
				onClick={handleGoogle}
				disabled={redirecting}
				className={PRIMARY}
			>
				{redirecting ? (
					<Loader2 className="size-4 animate-spin" />
				) : (
					<GoogleLogo weight="bold" className="size-4" />
				)}
				{t(
					redirecting
						? "ui.account.redirecting"
						: "ui.account.continueWithGoogle",
				)}
			</button>

			<div className="flex flex-col items-center gap-1 border-border border-t pt-5 text-center">
				<p className="text-muted-foreground text-xs">
					{t("ui.account.optional")}
				</p>
				<button
					type="button"
					onClick={() => setView("fretboard")}
					className="font-semibold text-secondary-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
				>
					{t("ui.account.skip")}
				</button>
			</div>
		</div>
	);
}

function SignedIn() {
	const { t } = useTranslation();
	const { user, signOut, error } = useAuth();
	const { setView } = useView();
	if (!user) return null;

	return (
		<div className="flex flex-col items-center gap-6 text-center">
			<UserAvatar user={user} className="size-16 text-xl" />
			<div className="flex flex-col gap-1">
				<h1 className="font-bold font-display text-2xl tracking-[-0.02em]">
					{displayName(user)}
				</h1>
				{user.email && (
					<p className="text-secondary-foreground text-sm">{user.email}</p>
				)}
				<p className="mt-1 inline-flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
					<GoogleLogo weight="bold" className="size-3.5" />
					{t("ui.account.signedInWith")}
				</p>
			</div>

			{error && (
				<ErrorNote>
					<p>{error}</p>
				</ErrorNote>
			)}

			<div className="flex w-full flex-col gap-2">
				<button
					type="button"
					onClick={() => setView("fretboard")}
					className={PRIMARY}
				>
					{t("ui.account.backToApp")}
				</button>
				<button type="button" onClick={signOut} className={SECONDARY}>
					<LogOut className="size-4" />
					{t("ui.account.signOut")}
				</button>
			</div>
		</div>
	);
}

function Unavailable() {
	const { t } = useTranslation();
	const { setView } = useView();

	return (
		<div className="flex flex-col items-center gap-5 text-center">
			<BrandMark />
			<p className="text-secondary-foreground text-sm">
				{t("ui.account.unavailable")}
			</p>
			<button
				type="button"
				onClick={() => setView("fretboard")}
				className={SECONDARY}
			>
				{t("ui.account.backToApp")}
			</button>
		</div>
	);
}

function ErrorNote({ children }: { children: ReactNode }) {
	return (
		<div
			role="alert"
			className="w-full rounded-lg bg-destructive/10 px-3 py-2.5 text-left text-destructive text-sm"
		>
			{children}
		</div>
	);
}
