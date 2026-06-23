import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useView, ViewProvider } from "./ViewContext";

function Probe() {
	const { view, setView } = useView();
	return (
		<div>
			<span data-testid="view">{view}</span>
			<button type="button" onClick={() => setView("showroom")}>
				go showroom
			</button>
		</div>
	);
}

describe("ViewContext", () => {
	beforeEach(() => localStorage.clear());

	it("defaults to the fretboard view", () => {
		render(
			<ViewProvider>
				<Probe />
			</ViewProvider>,
		);
		expect(screen.getByTestId("view")).toHaveTextContent("fretboard");
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
});
