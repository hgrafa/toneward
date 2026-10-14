import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/account/AccountButton";
import { AccountScreen } from "@/components/account/AccountScreen";
import { AuthProvider } from "@/hooks/AuthContext";
import { ViewProvider } from "@/hooks/ViewContext";

const auth = vi.hoisted(() => ({
	session: null as null | { user: Record<string, unknown> },
	signInWithOAuth: vi.fn(),
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	resetPasswordForEmail: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
	supabase: {
		auth: {
			onAuthStateChange: (
				cb: (event: string, session: typeof auth.session) => void,
			) => {
				queueMicrotask(() => cb("INITIAL_SESSION", auth.session));
				return { data: { subscription: { unsubscribe: () => {} } } };
			},
			signInWithOAuth: auth.signInWithOAuth,
			signInWithPassword: auth.signInWithPassword,
			signUp: auth.signUp,
			resetPasswordForEmail: auth.resetPasswordForEmail,
			signOut: auth.signOut,
		},
	},
}));

vi.mock("@/components/account/backdrops/WavesBackdrop", () => ({
	WavesBackdrop: () => null,
}));

const USER = {
	id: "user-1",
	email: "hugo@example.com",
	app_metadata: { provider: "google" },
	user_metadata: { full_name: "Hugo Rafael" },
};

async function openAccount(trigger: "Sign in" | "Account" = "Sign in") {
	render(
		<AuthProvider>
			<ViewProvider>
				<AccountButton />
				<AccountScreen />
			</ViewProvider>
		</AuthProvider>,
	);
	fireEvent.click(await screen.findByRole("button", { name: trigger }));
	return screen.getByRole("dialog");
}

function type(label: string, value: string) {
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** The form's submit button (the mode tabs share its label). */
function submit() {
	const button = screen
		.getAllByRole("button")
		.find((b) => b.getAttribute("type") === "submit");
	if (!button) throw new Error("no submit button");
	fireEvent.click(button);
}

describe("AccountScreen", () => {
	beforeEach(() => {
		localStorage.clear();
		auth.session = null;
		auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
		auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
		auth.signUp
			.mockReset()
			.mockResolvedValue({ data: { session: null }, error: null });
		auth.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
		auth.signOut.mockReset().mockResolvedValue({ error: null });
	});

	it("opens full-screen from the header and switches to create account", async () => {
		await openAccount();
		expect(screen.getByText("Welcome back")).toBeInTheDocument();
		expect(
			screen.queryByText("Toneward works without an account."),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(screen.getByText("Create your account")).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: "Create account" })[0],
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByLabelText("Name")).toBeInTheDocument();
	});

	it("creates an account with email and asks to confirm it", async () => {
		await openAccount();
		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		type("Name", "Hugo");
		type("Email", " hugo@example.com ");
		type("Password", "correct-horse");
		submit();

		expect(await screen.findByText("Check your email")).toBeInTheDocument();
		expect(screen.getByText(/hugo@example\.com/)).toBeInTheDocument();
		expect(auth.signUp).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "hugo@example.com",
				password: "correct-horse",
				options: expect.objectContaining({ data: { full_name: "Hugo" } }),
			}),
		);
	});

	it("signs in with email and translates wrong credentials", async () => {
		auth.signInWithPassword.mockResolvedValue({
			error: {
				code: "invalid_credentials",
				message: "Invalid login credentials",
			},
		});
		await openAccount();
		type("Email", "hugo@example.com");
		type("Password", "nope");
		submit();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Wrong email or password.",
		);
		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: "hugo@example.com",
			password: "nope",
		});
	});

	it("sends a password reset link", async () => {
		await openAccount();
		fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
		expect(screen.getByText("Reset your password")).toBeInTheDocument();
		type("Email", "hugo@example.com");
		submit();

		expect(await screen.findByText("Check your email")).toBeInTheDocument();
		expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
			"hugo@example.com",
			expect.objectContaining({ redirectTo: expect.any(String) }),
		);
	});

	it("starts the Google OAuth redirect", async () => {
		await openAccount();
		fireEvent.click(
			screen.getByRole("button", { name: "Continue with Google" }),
		);
		expect(auth.signInWithOAuth).toHaveBeenCalledWith(
			expect.objectContaining({ provider: "google" }),
		);
		expect(
			await screen.findByRole("button", { name: "Redirecting to Google…" }),
		).toBeDisabled();
	});

	it("shows why Google sign-in could not start", async () => {
		auth.signInWithOAuth.mockResolvedValue({
			error: { message: "Unsupported provider: provider is not enabled" },
		});
		await openAccount();
		fireEvent.click(
			screen.getByRole("button", { name: "Continue with Google" }),
		);
		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"Couldn't sign in with Google. Please try again.",
		);
		expect(alert).toHaveTextContent("provider is not enabled");
	});

	it("closes when continuing without an account", async () => {
		await openAccount();
		fireEvent.click(
			screen.getByRole("button", { name: "Continue without an account" }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows the signed-in profile and signs out", async () => {
		auth.session = { user: USER };
		await openAccount("Account");
		expect(screen.getByText("Hugo Rafael")).toBeInTheDocument();
		expect(screen.getByText("hugo@example.com")).toBeInTheDocument();
		expect(screen.getByText("Signed in with Google")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
		expect(auth.signOut).toHaveBeenCalled();
	});
});
