import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 26 exposes a non-functional `localStorage` global that shadows jsdom's.
// vitest's populateGlobal skips it because `'localStorage' in global` is already true.
// Grab the real Storage object directly from the jsdom instance and patch the global.
{
	const jsdomInstance = (globalThis as Record<string, unknown>).jsdom as
		| { window: { localStorage: Storage; sessionStorage: Storage } }
		| undefined;
	if (jsdomInstance) {
		Object.defineProperty(globalThis, "localStorage", {
			value: jsdomInstance.window.localStorage,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(globalThis, "sessionStorage", {
			value: jsdomInstance.window.sessionStorage,
			writable: true,
			configurable: true,
		});
	}
}

afterEach(() => {
	cleanup();
});
