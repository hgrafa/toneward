import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudyTimerProvider } from "@/hooks/StudyTimerContext";
import { StudyTimerPanel } from "./StudyTimerPanel";

describe("StudyTimerPanel", () => {
	it("accepts a typed countdown duration and rejects an empty edit", () => {
		render(
			<StudyTimerProvider>
				<StudyTimerPanel />
			</StudyTimerProvider>,
		);
		const input = screen.getByRole("spinbutton", {
			name: "Duration in minutes",
		});
		input.focus();
		fireEvent.change(input, { target: { value: "37" } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue(37);
		fireEvent.change(input, { target: { value: "" } });
		fireEvent.blur(input);
		expect(input).toHaveValue(37);
	});
});
