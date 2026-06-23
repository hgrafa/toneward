import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App shell", () => {
	it("mounts with the header and the floating nav", () => {
		render(<App />);
		// Brand wordmark lives in the header.
		expect(screen.getByText("Toneward")).toBeInTheDocument();
		// Floating nav exposes the three views as buttons.
		expect(screen.getByRole("button", { name: "Fretboard" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			screen.getByRole("button", { name: "Showroom" }),
		).toBeInTheDocument();
		// The persistent player mounts once at the shell.
		expect(screen.getByLabelText("Open player")).toBeInTheDocument();
	});
});
