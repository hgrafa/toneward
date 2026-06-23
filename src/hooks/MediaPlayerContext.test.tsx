import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MediaPlayerProvider, useMediaPlayerCtx } from "./MediaPlayerContext";

const wrapper = ({ children }: { children: ReactNode }) => (
	<MediaPlayerProvider>{children}</MediaPlayerProvider>
);

describe("MediaPlayerContext", () => {
	it("starts with no source and exposes a player api", () => {
		const { result } = renderHook(() => useMediaPlayerCtx(), { wrapper });
		expect(result.current.source).toBeNull();
		expect(typeof result.current.api.toggle).toBe("function");
	});

	it("revokes a prior mp3 blob url when the source is replaced", () => {
		const revoke = vi.spyOn(URL, "revokeObjectURL");
		const { result } = renderHook(() => useMediaPlayerCtx(), { wrapper });

		act(() =>
			result.current.setSource({
				kind: "mp3",
				objectUrl: "blob:one",
				title: "one",
			}),
		);
		act(() =>
			result.current.setSource({
				kind: "mp3",
				objectUrl: "blob:two",
				title: "two",
			}),
		);

		expect(revoke).toHaveBeenCalledWith("blob:one");
		expect(result.current.source?.title).toBe("two");
		revoke.mockRestore();
	});
});
