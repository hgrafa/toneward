import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
	it("parses standard watch URLs", () => {
		expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("parses watch URLs with extra params", () => {
		expect(
			parseYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc"),
		).toBe("dQw4w9WgXcQ");
	});

	it("parses youtu.be short links", () => {
		expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=xyz")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("parses /embed/ and /shorts/ URLs", () => {
		expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
		expect(parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
			"dQw4w9WgXcQ",
		);
	});

	it("returns null for non-YouTube hosts", () => {
		expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
	});

	it("returns null for malformed input", () => {
		expect(parseYouTubeId("not a url")).toBeNull();
		expect(parseYouTubeId("")).toBeNull();
		expect(
			parseYouTubeId("https://www.youtube.com/watch?v=tooShort"),
		).toBeNull();
	});
});
