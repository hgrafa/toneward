import { GoogleLogo } from "@phosphor-icons/react";
import { Loader2, LogOut, Mail, Pause, Play, X } from "lucide-react";
import {
	type ComponentProps,
	type FormEvent,
	type ReactNode,
	useEffect,
	useId,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AuthFailure, useAuth } from "@/hooks/AuthContext";
import { useView } from "@/hooks/ViewContext";
import { NotationLayer } from "./backdrops/NotationLayer";
import { WavesBackdrop } from "./backdrops/WavesBackdrop";
import { displayName, UserAvatar } from "./UserAvatar";

type Mode = "signIn" | "register" | "reset";
const TABS = ["signIn", "register"] as const;
const MIN_PASSWORD = 8;

const PRIMARY =
	"flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-foreground font-semibold text-[15px] text-background transition-opacity hover:opacity-90 disabled:opacity-60";
const SECONDARY =
	"flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card font-semibold text-[15px] text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-60";
const LINK =
	"font-semibold text-secondary-foreground text-sm underline-offset-4 hover:text-foreground hover:underline";
const TITLE =
	"font-bold font-display text-[32px] leading-tight tracking-[-0.03em] lg:text-[40px]";

// Static film grain over the backdrop; hides gradient banding.
const GRAIN =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const KNOWN_ERRORS = [
	"invalid_credentials",
	"email_not_confirmed",
	"user_already_exists",
	"weak_password",
	"over_email_send_rate_limit",
] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

/** Translates the Supabase errors users actually hit; anything else shows Supabase's message. */
function useAuthErrorText() {
	const { t } = useTranslation();
	return (error: AuthFailure) =>
		KNOWN_ERRORS.includes(error.code as KnownError)
			? t(`ui.account.errors.${error.code as KnownError}`)
			: error.message;
}

/** Full-screen sign-in layered over the app, so the current view and player keep running. */
export function AccountScreen() {
	const { t } = useTranslation();
	const { configured, loading, user, recovering } = useAuth();
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
					<div className="w-full max-w-[480px] rounded-3xl bg-card p-7 text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-black/5 sm:p-10 lg:max-w-[540px] lg:p-12">
						<DialogTitle className="sr-only">
							{t("ui.account.section")}
						</DialogTitle>
						{!configured ? (
							<Unavailable />
						) : loading ? (
							<div className="flex justify-center py-16">
								<Loader2 className="size-7 animate-spin text-muted-foreground" />
							</div>
						) : recovering ? (
							<NewPassword />
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
	const {
		signInWithGoogle,
		signInWithPassword,
		signUp,
		sendPasswordReset,
		error,
	} = useAuth();
	const { setAccountOpen } = useView();
	const errorText = useAuthErrorText();
	const [mode, setMode] = useState<Mode>("signIn");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [sent, setSent] = useState<{
		kind: "confirm" | "reset";
		email: string;
	} | null>(null);
	const [redirecting, setRedirecting] = useState(false);

	// Coming back from Google with the Back button restores this page from bfcache.
	useEffect(() => {
		const reset = () => setRedirecting(false);
		window.addEventListener("pageshow", reset);
		return () => window.removeEventListener("pageshow", reset);
	}, []);

	function switchMode(next: Mode) {
		setMode(next);
		setFormError(null);
	}

	async function handleGoogle() {
		setRedirecting(true);
		if (!(await signInWithGoogle())) setRedirecting(false);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const address = email.trim();
		setBusy(true);
		setFormError(null);
		const result =
			mode === "signIn"
				? await signInWithPassword(address, password)
				: mode === "register"
					? await signUp(name.trim(), address, password)
					: await sendPasswordReset(address);
		setBusy(false);
		if (result.error) {
			setFormError(errorText(result.error));
		} else if (mode === "reset") {
			setSent({ kind: "reset", email: address });
		} else if (result.confirmEmail) {
			setSent({ kind: "confirm", email: address });
		}
		// A successful sign-in needs nothing here: the auth listener swaps in the profile.
	}

	if (sent) {
		return (
			<div className="flex flex-col items-center gap-6 text-center">
				<div className="flex size-16 items-center justify-center rounded-2xl bg-[#ece6dd]">
					<Mail className="size-7 text-secondary-foreground" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className={TITLE}>{t("ui.account.checkEmailTitle")}</h1>
					<p className="text-[15px] text-secondary-foreground leading-relaxed">
						{t(
							sent.kind === "confirm"
								? "ui.account.confirmSent"
								: "ui.account.resetSent",
							{ email: sent.email },
						)}
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setSent(null);
						setPassword("");
						switchMode("signIn");
					}}
					className={SECONDARY}
				>
					{t("ui.account.backToSignIn")}
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{mode !== "reset" && (
				<fieldset
					aria-label={t("ui.account.modeLabel")}
					className="grid grid-cols-2 gap-1 rounded-xl bg-[#ece6dd] p-1"
				>
					{TABS.map((m) => (
						<button
							key={m}
							type="button"
							aria-pressed={mode === m}
							onClick={() => switchMode(m)}
							className={`rounded-lg py-2 font-semibold text-sm transition-colors ${
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
			)}

			<div className="flex flex-col gap-2">
				<h1 className={TITLE}>
					{t(
						mode === "signIn"
							? "ui.account.signInTitle"
							: mode === "register"
								? "ui.account.registerTitle"
								: "ui.account.resetTitle",
					)}
				</h1>
				<p className="text-[15px] text-secondary-foreground leading-relaxed">
					{t(
						mode === "signIn"
							? "ui.account.signInSubtitle"
							: mode === "register"
								? "ui.account.registerSubtitle"
								: "ui.account.resetSubtitle",
					)}
				</p>
			</div>

			{error && mode !== "reset" && (
				<ErrorNote>
					<p className="font-semibold">{t("ui.account.signInFailed")}</p>
					<p className="opacity-80">{error}</p>
				</ErrorNote>
			)}

			{mode !== "reset" && (
				<>
					<div className="flex flex-col gap-2">
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
						<p className="text-center text-muted-foreground text-xs">
							{t("ui.account.googleHint")}
						</p>
					</div>
					<div className="flex items-center gap-3 text-muted-foreground text-xs uppercase tracking-wider">
						<span className="h-px flex-1 bg-border" />
						{t("ui.account.orEmail")}
						<span className="h-px flex-1 bg-border" />
					</div>
				</>
			)}

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{mode === "register" && (
					<Field
						label={t("ui.account.name")}
						autoComplete="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				)}
				<Field
					label={t("ui.account.email")}
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				{mode !== "reset" && (
					<Field
						label={t("ui.account.password")}
						type="password"
						autoComplete={
							mode === "register" ? "new-password" : "current-password"
						}
						required
						minLength={mode === "register" ? MIN_PASSWORD : undefined}
						hint={
							mode === "register" ? t("ui.account.passwordHint") : undefined
						}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						action={
							mode === "signIn" && (
								<button
									type="button"
									onClick={() => switchMode("reset")}
									className={LINK}
								>
									{t("ui.account.forgotPassword")}
								</button>
							)
						}
					/>
				)}
				{formError && (
					<ErrorNote>
						<p>{formError}</p>
					</ErrorNote>
				)}
				<button
					type="submit"
					disabled={busy}
					className={mode === "reset" ? PRIMARY : SECONDARY}
				>
					{busy && <Loader2 className="size-5 animate-spin" />}
					{t(
						mode === "signIn"
							? "ui.account.signIn"
							: mode === "register"
								? "ui.account.createAccount"
								: "ui.account.sendResetLink",
					)}
				</button>
			</form>

			{mode === "reset" && (
				<button
					type="button"
					onClick={() => switchMode("signIn")}
					className={`${LINK} self-center`}
				>
					{t("ui.account.backToSignIn")}
				</button>
			)}

			<button
				type="button"
				onClick={() => setAccountOpen(false)}
				className={`${LINK} self-center`}
			>
				{t("ui.account.skip")}
			</button>
		</div>
	);
}

/** Shown after following a password-reset link: the session is live, but needs a new password. */
function NewPassword() {
	const { t } = useTranslation();
	const { updatePassword } = useAuth();
	const errorText = useAuthErrorText();
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setFormError(null);
		const { error } = await updatePassword(password);
		setBusy(false);
		if (error) setFormError(errorText(error));
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className={TITLE}>{t("ui.account.newPasswordTitle")}</h1>
				<p className="text-[15px] text-secondary-foreground leading-relaxed">
					{t("ui.account.newPasswordSubtitle")}
				</p>
			</div>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<Field
					label={t("ui.account.password")}
					type="password"
					autoComplete="new-password"
					required
					minLength={MIN_PASSWORD}
					hint={t("ui.account.passwordHint")}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{formError && (
					<ErrorNote>
						<p>{formError}</p>
					</ErrorNote>
				)}
				<button type="submit" disabled={busy} className={PRIMARY}>
					{busy && <Loader2 className="size-5 animate-spin" />}
					{t("ui.account.savePassword")}
				</button>
			</form>
		</div>
	);
}

function SignedIn() {
	const { t } = useTranslation();
	const { user, signOut, error } = useAuth();
	const { setAccountOpen } = useView();
	if (!user) return null;

	const name = displayName(user);
	const viaGoogle = user.app_metadata?.provider === "google";

	return (
		<div className="flex flex-col items-center gap-7 text-center">
			<UserAvatar user={user} className="size-20 text-2xl" />
			<div className="flex flex-col gap-1.5">
				<h1 className={TITLE}>{name}</h1>
				{user.email && user.email !== name && (
					<p className="text-[15px] text-secondary-foreground">{user.email}</p>
				)}
				<p className="mt-1 inline-flex items-center justify-center gap-1.5 text-muted-foreground text-sm">
					{viaGoogle ? (
						<GoogleLogo weight="bold" className="size-4" />
					) : (
						<Mail className="size-4" />
					)}
					{t(
						viaGoogle
							? "ui.account.signedInWithGoogle"
							: "ui.account.signedInWithEmail",
					)}
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

function Field({
	label,
	hint,
	action,
	...props
}: {
	label: string;
	hint?: string;
	/** Rendered under the input, right-aligned (e.g. "Forgot password?"). */
	action?: ReactNode;
} & ComponentProps<typeof Input>) {
	const id = useId();
	const hintId = `${id}-hint`;

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id} className="font-semibold text-sm">
				{label}
			</Label>
			<Input
				id={id}
				aria-describedby={hint ? hintId : undefined}
				className="h-11 rounded-xl bg-background px-4 text-[15px] md:text-[15px]"
				{...props}
			/>
			{(hint || action) && (
				<div className="flex items-center justify-between gap-3">
					{hint ? (
						<p id={hintId} className="text-muted-foreground text-xs">
							{hint}
						</p>
					) : (
						<span />
					)}
					{action}
				</div>
			)}
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
