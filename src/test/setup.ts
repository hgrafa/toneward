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

// jsdom's Blob/File only implement slice/size/type — no arrayBuffer()/text().
// Swap in Node's spec-complete implementations so storage code that reads bytes
// works under test (real browsers already provide these).
{
	const { Blob: NodeBlob, File: NodeFile } = await import("node:buffer");
	globalThis.Blob = NodeBlob as unknown as typeof Blob;
	globalThis.File = NodeFile as unknown as typeof File;
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Define stubs so vi.spyOn can wrap them in component tests.
if (!URL.createObjectURL) {
	URL.createObjectURL = () => "";
}
if (!URL.revokeObjectURL) {
	URL.revokeObjectURL = () => {};
}

// jsdom does not implement ResizeObserver (used by Radix UI Slider).
if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}

afterEach(() => {
	cleanup();
});

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/locales/en";

if (!i18next.isInitialized) {
	i18next.use(initReactI18next).init({
		lng: "en",
		fallbackLng: "en",
		resources: { en: { translation: en } },
		interpolation: { escapeValue: false },
	});
}
