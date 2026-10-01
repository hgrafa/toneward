import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	FretboardDiagram,
	MAIN_DIMENSIONS,
} from "@/components/FretboardDiagram";
import type { FretPosition } from "@/types/music";

describe("FretboardDiagram root dot", () => {
	it("fills the root note with the brand color, not rose", () => {
		const root: FretPosition = {
			string: 1,
			fret: 5,
			note: "A",
			spelled: { letter: "A", accidental: 0 },
		};

		const { container } = render(
			<FretboardDiagram
				positions={[root]}
				stringCount={6}
				minFret={0}
				maxFret={12}
				dimensions={MAIN_DIMENSIONS}
				displayMode="note"
				highlightRoot
				rootPitchClass="A"
			/>,
		);

		expect(container.querySelector("circle.fill-brand")).not.toBeNull();
		expect(container.querySelector("circle.fill-rose-500")).toBeNull();
	});
});

describe("FretboardDiagram note activation", () => {
	const note: FretPosition = {
		string: 1,
		fret: 5,
		note: "A",
		spelled: { letter: "A", accidental: 0 },
	};

	it("activates a note marker with click, Enter, and Space", () => {
		const onClickPosition = vi.fn();
		render(
			<FretboardDiagram
				positions={[note]}
				stringCount={6}
				minFret={0}
				maxFret={12}
				dimensions={MAIN_DIMENSIONS}
				displayMode="note"
				highlightRoot={false}
				onClickPosition={onClickPosition}
				positionAriaLabel={(pos) => `A, string ${pos.string}, fret ${pos.fret}`}
			/>,
		);
		const marker = screen.getByRole("button", { name: /A.*string 1.*fret 5/i });
		fireEvent.click(marker);
		fireEvent.keyDown(marker, { key: "Enter" });
		fireEvent.keyDown(marker, { key: " " });
		expect(onClickPosition).toHaveBeenCalledTimes(3);
		expect(onClickPosition).toHaveBeenNthCalledWith(1, note);
	});
});
