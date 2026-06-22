import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { "@": resolve(__dirname, "./src") },
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		exclude: [
			...defaultExclude,
			"**/.claude/worktrees/**",
			"**/.agents/worktrees/**",
		],
	},
});
