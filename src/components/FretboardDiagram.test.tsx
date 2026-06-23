import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
