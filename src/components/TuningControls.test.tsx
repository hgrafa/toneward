import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FretboardProvider } from "@/hooks/useFretboardContext";
import { TuningControls } from "./TuningControls";

function setup() {
	return render(
		<FretboardProvider>
			<TuningControls />
		</FretboardProvider>,
	);
}

describe("TuningControls", () => {
	beforeEach(() => localStorage.clear());

	it("renders one note picker per string plus the instrument picker", () => {
		setup();
		// 6 guitar strings + 1 instrument select = 7 comboboxes
		expect(screen.getAllByRole("combobox")).toHaveLength(7);
		// per-string pickers are individually labeled (low E = string 6 ... high E = string 1)
		expect(screen.getByLabelText("String 6 tuning")).toBeInTheDocument();
		expect(screen.getByLabelText("String 1 tuning")).toBeInTheDocument();
	});

	it("shows the current string count", () => {
		setup();
		expect(screen.getByText(/6 strings/i)).toBeInTheDocument();
	});
});
