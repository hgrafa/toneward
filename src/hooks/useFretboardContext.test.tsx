import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { FretboardProvider, useInstrument } from "./useFretboardContext";

function wrapper({ children }: { children: ReactNode }) {
	return <FretboardProvider>{children}</FretboardProvider>;
}

describe("useFretboard tuning state", () => {
	beforeEach(() => localStorage.clear());

	it("defaults to 6-string guitar", () => {
		const { result } = renderHook(() => useInstrument(), { wrapper });
		expect(result.current.tuning).toEqual(["E", "A", "D", "G", "B", "E"]);
		expect(result.current.instrumentId).toBe("guitar-6");
	});

	it("applies a preset via setInstrument", () => {
		const { result } = renderHook(() => useInstrument(), { wrapper });
		act(() => result.current.setInstrument("bass-4"));
		expect(result.current.tuning).toEqual(["E", "A", "D", "G"]);
		expect(result.current.instrumentId).toBe("bass-4");
	});

	it("editing a string makes the instrument custom", () => {
		const { result } = renderHook(() => useInstrument(), { wrapper });
		act(() => result.current.setStringTuning(0, "D"));
		expect(result.current.tuning[0]).toBe("D");
		expect(result.current.instrumentId).toBe("custom");
	});

	it("adds and removes strings at the low-pitch end", () => {
		const { result } = renderHook(() => useInstrument(), { wrapper });
		act(() => result.current.setInstrument("bass-5")); // B E A D G (low B)
		act(() => result.current.setStringCount(6));
		// prepends a default "E" at the low end, NOT a copy of the current low string (B)
		expect(result.current.tuning).toEqual(["E", "B", "E", "A", "D", "G"]);
		act(() => result.current.setStringCount(5));
		// drops the lowest string
		expect(result.current.tuning).toEqual(["B", "E", "A", "D", "G"]);
	});

	it("persists the tuning across remounts", () => {
		const first = renderHook(() => useInstrument(), { wrapper });
		act(() => first.result.current.setInstrument("bass-5"));
		first.unmount();
		const second = renderHook(() => useInstrument(), { wrapper });
		expect(second.result.current.tuning).toEqual(["B", "E", "A", "D", "G"]);
		expect(second.result.current.instrumentId).toBe("bass-5");
	});

	it("clamps string count to 1..12", () => {
		const { result } = renderHook(() => useInstrument(), { wrapper });
		act(() => result.current.setStringCount(99));
		expect(result.current.tuning.length).toBe(12);
		act(() => result.current.setStringCount(0));
		expect(result.current.tuning.length).toBe(1);
	});
});
