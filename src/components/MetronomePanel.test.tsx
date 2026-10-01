import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioDevicesProvider } from "@/hooks/AudioDevicesContext";
import { MetronomeProvider } from "@/hooks/MetronomeContext";
import { MetronomePanel } from "./MetronomePanel";

describe("MetronomePanel", () => {
	it("accepts a typed tempo and clamps it to the allowed range", () => {
		render(
			<AudioDevicesProvider>
				<MetronomeProvider>
					<MetronomePanel />
				</MetronomeProvider>
			</AudioDevicesProvider>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Metronome" }));
		const input = screen.getByRole("spinbutton", { name: "Tempo in BPM" });
		input.focus();
		fireEvent.change(input, { target: { value: "132" } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue(132);
		fireEvent.change(input, { target: { value: "500" } });
		fireEvent.blur(input);
		expect(input).toHaveValue(300);
	});
});
