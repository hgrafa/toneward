import { afterEach, describe, expect, it } from "vitest";
import {
	clearGoogleRedirect,
	createGoogleSignInUrl,
	readGoogleRedirect,
} from "./googleSignIn";

const CLIENT = "client-123.apps.googleusercontent.com";

async function startSignIn() {
	const url = new URL(
		await createGoogleSignInUrl(CLIENT, "https://toneward.test"),
	);
	const { state, nonce } = JSON.parse(
		sessionStorage.getItem("toneward.google-sign-in") ?? "{}",
	);
	return { url, state, nonce };
}

function returnWith(hash: string) {
	window.history.replaceState(null, "", `/#${hash}`);
}

describe("googleSignIn", () => {
	afterEach(() => {
		sessionStorage.clear();
		window.history.replaceState(null, "", "/");
	});

	it("asks Google for an ID token bound to a hashed nonce", async () => {
		const { url, state, nonce } = await startSignIn();
		expect(url.origin + url.pathname).toBe(
			"https://accounts.google.com/o/oauth2/v2/auth",
		);
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			client_id: CLIENT,
			redirect_uri: "https://toneward.test",
			response_type: "id_token",
			scope: "openid email profile",
			state,
		});
		const hashed = url.searchParams.get("nonce");
		expect(hashed).toMatch(/^[0-9a-f]{64}$/);
		expect(hashed).not.toBe(nonce);
	});

	it("returns the ID token with the raw nonce, then clears it from the URL", async () => {
		const { state, nonce } = await startSignIn();
		returnWith(`state=${state}&id_token=jwt-from-google`);

		expect(readGoogleRedirect()).toEqual({
			credential: "jwt-from-google",
			nonce,
		});
		clearGoogleRedirect();
		expect(window.location.hash).toBe("");
		expect(readGoogleRedirect()).toBeNull();
	});

	it("rejects a response whose state doesn't match", async () => {
		await startSignIn();
		returnWith("state=someone-else&id_token=jwt");
		expect(readGoogleRedirect()).toEqual({
			error: "Google sign-in expired. Please try again.",
		});
	});

	it("treats backing out on Google's screen as no error", async () => {
		const { state } = await startSignIn();
		returnWith(`state=${state}&error=access_denied`);
		expect(readGoogleRedirect()).toEqual({ error: null });
	});

	it("ignores hashes it didn't start", () => {
		returnWith("state=abc&id_token=jwt");
		expect(readGoogleRedirect()).toBeNull();
	});
});
