import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useView, ViewProvider } from "./ViewContext";

function Probe() {
	const { view, setView, sidebarCollapsed, toggleSidebar } = useView();
	return (
		<div>
			<span data-testid="view">{view}</span>
			<span data-testid="collapsed">{String(sidebarCollapsed)}</span>
			<button type="button" onClick={() => setView("showroom")}>
				go showroom
			</button>
			<button type="button" onClick={toggleSidebar}>
				toggle
			</button>
		</div>
	);
}

describe("ViewContext", () => {
	beforeEach(() => localStorage.clear());

	it("defaults to the fretboard view, expanded sidebar", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		expect(screen.getByTestId("view")).toHaveTextContent("fretboard");
		expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
	});

	it("switches view and persists it to localStorage", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		act(() => screen.getByText("go showroom").click());
		expect(screen.getByTestId("view")).toHaveTextContent("showroom");
		expect(localStorage.getItem("fretboard.view")).toBe("showroom");
	});

	it("toggles and persists sidebar collapse", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		act(() => screen.getByText("toggle").click());
		expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
		expect(localStorage.getItem("fretboard.sidebarCollapsed")).toBe("true");
	});
});
