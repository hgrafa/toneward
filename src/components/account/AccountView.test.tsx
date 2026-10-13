import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/account/AccountButton";
import { AccountView } from "@/components/account/AccountView";
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

const USER = {
	id: "user-1",
	email: "hugo@example.com",
	user_metadata: { full_name: "Hugo Rafael" },
};

function renderAccount() {
	return render(
		<AuthProvider>
			<ViewProvider>
				<AccountButton />
				<AccountView />
			</ViewProvider>
		</AuthProvider>,
	);
}

describe("AccountView", () => {
	beforeEach(() => {
		localStorage.clear();
		auth.session = null;
		auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
		auth.signOut.mockReset().mockResolvedValue({ error: null });
	});

	it("switches between the sign-in and create-account screens", async () => {
		renderAccount();
		expect(await screen.findByText("Welcome back")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(screen.getByText("Create your account")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create account" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("starts the Google OAuth redirect", async () => {
		renderAccount();
		fireEvent.click(
			await screen.findByRole("button", { name: "Continue with Google" }),
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
		renderAccount();
		fireEvent.click(
			await screen.findByRole("button", { name: "Continue with Google" }),
		);
		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent(
			"Couldn't sign in with Google. Please try again.",
		);
		expect(alert).toHaveTextContent("provider is not enabled");
	});

	it("shows the signed-in profile and signs out", async () => {
		auth.session = { user: USER };
		renderAccount();
		expect(await screen.findByText("Hugo Rafael")).toBeInTheDocument();
		expect(screen.getByText("hugo@example.com")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
		expect(auth.signOut).toHaveBeenCalled();
	});

	it("offers a header sign-in button while signed out", async () => {
		render(
			<AuthProvider>
				<ViewProvider>
					<AccountButton />
				</ViewProvider>
			</AuthProvider>,
		);
		const button = await screen.findByRole("button", { name: "Sign in" });
		expect(button).toHaveAttribute("data-active", "false");
		fireEvent.click(button);
		expect(button).toHaveAttribute("data-active", "true");
	});
});
