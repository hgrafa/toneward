import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FloatingNav } from "@/components/FloatingNav";
import { ViewProvider } from "@/hooks/ViewContext";

describe("FloatingNav", () => {
	it("renders the four views and marks the active one", () => {
		render(
			<ViewProvider>
				<FloatingNav />
			</ViewProvider>,
		);
		const home = screen.getByRole("button", { name: "Home" });
		expect(home).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("button", { name: "Fretboard" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Showroom" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Practice" }),
		).toBeInTheDocument();
	});

	it("switches the active view on click", () => {
		render(
			<ViewProvider>
				<FloatingNav />
			</ViewProvider>,
		);
		act(() => screen.getByRole("button", { name: "Showroom" }).click());
		expect(screen.getByRole("button", { name: "Showroom" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute(
			"aria-current",
		);
	});
});
