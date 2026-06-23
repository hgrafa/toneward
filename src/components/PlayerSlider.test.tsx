import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerSlider, type SliderStop } from "@/components/PlayerSlider";

const SPEED_STOPS: SliderStop[] = [
	{ value: 0.5, label: ".5" },
	{ value: 1, label: "1" },
	{ value: 2, label: "2" },
];

function renderSpeed(value: number) {
	return render(
		<PlayerSlider
			value={value}
			min={0.5}
			max={2}
			step={0.05}
			scale="log"
			ariaLabel="speed"
			stops={SPEED_STOPS}
			onChange={() => {}}
		/>,
	);
}

const thumbOf = (container: HTMLElement) =>
	container.querySelector('[class~="size-3.5"]') as HTMLElement;

describe("PlayerSlider", () => {
	it("centers the geometric midpoint on a log scale (1 between 0.5 and 2)", () => {
		const { container, getByRole } = renderSpeed(1);
		// fraction 0.5 → dead centre of the track
		expect(thumbOf(container).style.left).toContain("0.5 *");
		expect(getByRole("slider")).toHaveAttribute("aria-valuenow", "1");
	});

	it("places each stop label at the same position as the thumb for that value", () => {
		const { container, getByRole } = renderSpeed(1);
		const stop1 = getByRole("button", { name: "1" });
		expect(stop1.style.left).toBe(thumbOf(container).style.left);
	});

	it("pins the min and max stops to the track ends", () => {
		const { getByRole } = renderSpeed(1);
		// fraction 0 and 1 at the extremes
		expect(getByRole("button", { name: ".5" }).style.left).toContain("0 *");
		expect(getByRole("button", { name: "2" }).style.left).toContain("1 *");
	});
});
