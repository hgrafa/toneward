import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/account/AccountButton";
import { AccountScreen } from "@/components/account/AccountScreen";
import { AuthProvider } from "@/hooks/AuthContext";
import { ViewProvider } from "@/hooks/ViewContext";

const auth = vi.hoisted(() => ({
	session: null as null | { user: Record<string, unknown> },
	signInWithOAuth: vi.fn(),
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

describe("AccountScreen", () => {
	beforeEach(() => {
		localStorage.clear();
		auth.session = null;
		auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
		auth.signOut.mockReset().mockResolvedValue({ error: null });
	});

	it("opens full-screen from the header and switches to create account", async () => {
		await openAccount();
		expect(screen.getByText("Welcome back")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(screen.getByText("Create your account")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create account" }),
		).toHaveAttribute("aria-pressed", "true");
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

		fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
		expect(auth.signOut).toHaveBeenCalled();
	});
});
