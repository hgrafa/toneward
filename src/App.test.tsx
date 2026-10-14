import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";

vi.mock("@/lib/supabase", () => ({ supabase: null }));

describe("App shell", () => {
	it("mounts with the header and the floating nav", () => {
		render(<App />);
		// Brand wordmark lives in the header.
		expect(screen.getByText("Toneward")).toBeInTheDocument();
		// Floating nav exposes the views as buttons; first visits land on Home.
		expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			screen.getByRole("button", { name: "Fretboard" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 1, name: "Hello there!" }),
		).toBeInTheDocument();
		// The persistent player mounts once at the shell.
		expect(screen.getByLabelText("Open player")).toBeInTheDocument();
	});
});
