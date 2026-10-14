import { GoogleLogo } from "@phosphor-icons/react";
import { Loader2, LogOut, Pause, Play, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { NotationLayer } from "./backdrops/NotationLayer";
import { WavesBackdrop } from "./backdrops/WavesBackdrop";
import { displayName, UserAvatar } from "./UserAvatar";

type Mode = "signIn" | "register";
const MODES: Mode[] = ["signIn", "register"];

const PRIMARY =
	"flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-foreground font-semibold text-[15px] text-background transition-opacity hover:opacity-90 disabled:opacity-60";
const SECONDARY =
	"flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card font-semibold text-[15px] text-secondary-foreground transition-colors hover:bg-muted";
const TITLE =
	"font-bold font-display text-[32px] leading-tight tracking-[-0.03em] lg:text-[40px]";

// Static film grain over the backdrop; hides gradient banding.
const GRAIN =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Full-screen sign-in layered over the app, so the current view and player keep running. */
export function AccountScreen() {
	const { t } = useTranslation();
	const { configured, loading, user } = useAuth();
	const { accountOpen, setAccountOpen } = useView();
	const [paused, setPaused] = useState(false);

	return (
		<Dialog open={accountOpen} onOpenChange={setAccountOpen}>
			<DialogContent
				showCloseButton={false}
				aria-describedby={undefined}
				className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-0 bg-[#23201c] p-0 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-none"
			>
				<WavesBackdrop paused={paused} />
				<NotationLayer paused={paused} />
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
					style={{ backgroundImage: GRAIN }}
				/>
				<div className="relative flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
					<div className="flex items-center gap-3">
						<BrandMark />
						<span className="font-display font-bold text-[19px] text-white tracking-[-0.02em]">
							{t("ui.appName")}
						</span>
					</div>
					<DialogClose
						aria-label={t("ui.account.close")}
						className="flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 font-semibold text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
					>
						<X className="size-4" />
						<span className="hidden sm:inline">{t("ui.account.close")}</span>
					</DialogClose>
				</div>

				<div className="relative flex flex-1 items-center justify-center px-4 pt-4 pb-16 sm:pb-24">
					<div className="w-full max-w-[480px] rounded-3xl bg-card p-7 text-foreground ring-1 ring-black/5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] sm:p-10 lg:max-w-[540px] lg:p-12">
						<DialogTitle className="sr-only">
							{t("ui.account.section")}
						</DialogTitle>
						{!configured ? (
							<Unavailable />
						) : loading ? (
							<div className="flex justify-center py-16">
								<Loader2 className="size-7 animate-spin text-muted-foreground" />
							</div>
						) : user ? (
							<SignedIn />
						) : (
							<SignedOut />
						)}
					</div>
				</div>

				<button
					type="button"
					aria-pressed={paused}
					onClick={() => setPaused((p) => !p)}
					className="absolute bottom-4 left-5 z-10 flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white sm:left-8"
					aria-label={t(
						paused ? "ui.account.playMotion" : "ui.account.pauseMotion",
					)}
				>
					{paused ? <Play className="size-4" /> : <Pause className="size-4" />}
				</button>
			</DialogContent>
		</Dialog>
	);
}

function SignedOut() {
	const { t } = useTranslation();
	const { signInWithGoogle, error } = useAuth();
	const { setAccountOpen } = useView();
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
		<div className="flex flex-col gap-7">
			<fieldset
				aria-label={t("ui.account.modeLabel")}
				className="grid grid-cols-2 gap-1 rounded-xl bg-[#ece6dd] p-1"
			>
				{MODES.map((m) => (
					<button
						key={m}
						type="button"
						aria-pressed={mode === m}
						onClick={() => setMode(m)}
						className={`rounded-lg py-2 font-semibold text-sm transition-colors ${
							mode === m
								? "bg-card text-foreground shadow-sm"
								: "text-secondary-foreground hover:text-foreground"
						}`}
					>
						{t(
							m === "signIn" ? "ui.account.signIn" : "ui.account.createAccount",
						)}
					</button>
				))}
			</fieldset>

			<div className="flex flex-col gap-2">
				<h1 className={TITLE}>
					{t(
						mode === "signIn"
							? "ui.account.signInTitle"
							: "ui.account.registerTitle",
					)}
				</h1>
				<p className="text-[15px] text-secondary-foreground leading-relaxed">
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
					<Loader2 className="size-5 animate-spin" />
				) : (
					<GoogleLogo weight="bold" className="size-5" />
				)}
				{t(
					redirecting
						? "ui.account.redirecting"
						: "ui.account.continueWithGoogle",
				)}
			</button>

			<div className="flex flex-col items-center gap-1.5 border-border border-t pt-6 text-center">
				<p className="text-muted-foreground text-sm">
					{t("ui.account.optional")}
				</p>
				<button
					type="button"
					onClick={() => setAccountOpen(false)}
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
	const { setAccountOpen } = useView();
	if (!user) return null;

	return (
		<div className="flex flex-col items-center gap-7 text-center">
			<UserAvatar user={user} className="size-20 text-2xl" />
			<div className="flex flex-col gap-1.5">
				<h1 className={TITLE}>{displayName(user)}</h1>
				{user.email && (
					<p className="text-[15px] text-secondary-foreground">{user.email}</p>
				)}
				<p className="mt-1 inline-flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
					<GoogleLogo weight="bold" className="size-4" />
					{t("ui.account.signedInWith")}
				</p>
			</div>

			{error && (
				<ErrorNote>
					<p>{error}</p>
				</ErrorNote>
			)}

			<div className="flex w-full flex-col gap-2.5">
				<button
					type="button"
					onClick={() => setAccountOpen(false)}
					className={PRIMARY}
				>
					{t("ui.account.backToApp")}
				</button>
				<button type="button" onClick={signOut} className={SECONDARY}>
					<LogOut className="size-5" />
					{t("ui.account.signOut")}
				</button>
			</div>
		</div>
	);
}

function Unavailable() {
	const { t } = useTranslation();
	const { setAccountOpen } = useView();

	return (
		<div className="flex flex-col items-center gap-6 text-center">
			<p className="text-[15px] text-secondary-foreground">
				{t("ui.account.unavailable")}
			</p>
			<button
				type="button"
				onClick={() => setAccountOpen(false)}
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
			className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-left text-destructive text-sm"
		>
			{children}
		</div>
	);
}
