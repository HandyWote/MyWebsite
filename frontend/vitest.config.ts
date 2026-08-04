import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteUserConfig } from "vitest/config";

type VitestConfig = ViteUserConfig & {
	test: {
		environment: "jsdom";
		globals: boolean;
		setupFiles: string[];
		include: string[];
		coverage: {
			provider: "v8";
			reporter: ("text" | "json" | "html")[];
			include: string[];
			exclude: string[];
		};
	};
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const config: VitestConfig = {
	esbuild: {
		jsx: "automatic",
	},
	resolve: {
		alias: {
			"@": path.resolve(currentDir, "./src"),
			"server-only": path.resolve(currentDir, "./src/test/server-only.ts"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setupTests.js"],
		include: [
			"src/**/*.{test,spec}.{js,jsx,ts,tsx}",
			"app/**/*.{test,spec}.{js,jsx,ts,tsx}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.{js,jsx,ts,tsx}"],
			exclude: ["src/test/**"],
		},
	},
};

export default config;
