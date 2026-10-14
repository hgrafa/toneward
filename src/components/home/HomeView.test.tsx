import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/hooks/AuthContext";
import { useView, ViewProvider } from "@/hooks/ViewContext";
import { HomeView, partOfDay } from "./HomeView";

const auth = vi.hoisted(() => ({
	session: null as null | { user: Record<string, unknown> },
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
		},
	},
}));

function CurrentView() {
	return <span data-testid="view">{useView().view}</span>;
}

function renderHome() {
	render(
		<AuthProvider>
			<ViewProvider>
				<HomeView />
				<CurrentView />
			</ViewProvider>
		</AuthProvider>,
	);
}

describe("partOfDay", () => {
	it("buckets the hour into morning, afternoon, evening and night", () => {
		expect(partOfDay(5)).toBe("morning");
		expect(partOfDay(11)).toBe("morning");
		expect(partOfDay(12)).toBe("afternoon");
		expect(partOfDay(18)).toBe("evening");
		expect(partOfDay(22)).toBe("night");
		expect(partOfDay(3)).toBe("night");
	});
});

describe("HomeView", () => {
	beforeEach(() => {
		localStorage.clear();
		auth.session = null;
	});

	it("greets a signed-in user by first name", async () => {
		auth.session = {
			user: {
				id: "user-1",
				email: "hugo@example.com",
				app_metadata: {},
				user_metadata: { full_name: "Hugo Rafael" },
			},
		};
		renderHome();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Hello, Hugo!" }),
		).toBeInTheDocument();
	});

	it("greets signed-out visitors without a name", async () => {
		renderHome();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Hello there!" }),
		).toBeInTheDocument();
	});

	it("jumps to another page from a shortcut", async () => {
		renderHome();
		expect(screen.getByTestId("view")).toHaveTextContent("home");
		fireEvent.click(screen.getByRole("button", { name: /Practice/ }));
		expect(screen.getByTestId("view")).toHaveTextContent("practice");
	});
});
