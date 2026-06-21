import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MediaPlayerApi } from "@/hooks/useMediaPlayer";
import { AudioDock } from "./AudioDock";

function fakeApi(overrides: Partial<MediaPlayerApi> = {}): MediaPlayerApi {
	return {
		isPlaying: false,
		currentTime: 0,
		duration: 100,
		volume: 1,
		playbackRate: 1,
		error: null,
		play: vi.fn(),
		pause: vi.fn(),
		toggle: vi.fn(),
		seek: vi.fn(),
		skip: vi.fn(),
		setVolume: vi.fn(),
		setPlaybackRate: vi.fn(),
		...overrides,
	};
}

describe("AudioDock", () => {
	it("calls toggle when play/pause is clicked", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /play/i }));
		expect(api.toggle).toHaveBeenCalledTimes(1);
	});

	it("skips backward and forward by 10s", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /back 10/i }));
		fireEvent.click(screen.getByRole("button", { name: /forward 10/i }));
		expect(api.skip).toHaveBeenNthCalledWith(1, -10);
		expect(api.skip).toHaveBeenNthCalledWith(2, 10);
	});

	it("changes playback speed via preset label", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /speed/i }));
		fireEvent.click(screen.getByRole("button", { name: ".5" }));
		expect(api.setPlaybackRate).toHaveBeenCalledWith(0.5);
	});

	it("speed slider covers slow practice tempos via accessible range", () => {
		const api = fakeApi();
		render(
			<AudioDock
				api={api}
				title="My Track"
				kind="mp3"
				audioRef={createRef()}
				ytContainerRef={createRef()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /speed/i }));
		const slider = screen.getByRole("slider", { name: /playback speed/i });
		expect(slider).toHaveAttribute("aria-valuemin", "0.25");
		expect(slider).toHaveAttribute("aria-valuemax", "2");
		expect(Number(slider.getAttribute("aria-valuenow"))).toBeCloseTo(1);
	});
});
