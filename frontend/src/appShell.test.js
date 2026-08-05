import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PublicLayout from "../app/(public)/layout";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");

describe("Next app shell", () => {
	it("server-renders one persistent ordinary DOM ScreenHost in the public layout", () => {
		const html = renderToStaticMarkup(
			PublicLayout({
				children: createElement("article", null, "Server content"),
			}),
		);
		const document = new DOMParser().parseFromString(html, "text/html");
		const hosts = document.querySelectorAll(
			'#screen-host[data-screen-host="public"]',
		);

		expect(hosts).toHaveLength(1);
		expect(hosts[0].textContent).toBe("Server content");
		expect(hosts[0].parentElement?.getAttribute("data-screen-parking")).toBe(
			"true",
		);
	});

	it("keeps server and browser API addresses separated", () => {
		const server = fs.readFileSync(
			path.join(root, "src/api/server.ts"),
			"utf8",
		);
		const browser = fs.readFileSync(
			path.join(root, "src/api/browser.ts"),
			"utf8",
		);
		expect(server).toContain("import 'server-only'");
		expect(server).toContain("BACKEND_INTERNAL_URL");
		expect(browser).toContain("endpoint must be relative");
		expect(browser).not.toContain("BACKEND_INTERNAL_URL");
	});

	it("defines permanent redirects for legacy /app routes", () => {
		const source = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
		expect(source).toContain("source: '/app/articles/:id'");
		expect(source).toContain("destination: '/articles/:id'");
		expect(source).toContain("source: '/app/admin/:path*'");
		expect(source).toContain("permanent: true");
	});

	it("has no Vite, React Router or legacy 3D deployment chain files", () => {
		expect(fs.existsSync(path.join(root, "index.html"))).toBe(false);
		expect(fs.existsSync(path.join(root, "vite.config.js"))).toBe(false);
		expect(fs.existsSync(path.join(root, "src/main.jsx"))).toBe(false);
		expect(fs.existsSync(path.join(root, "src/App.jsx"))).toBe(false);
		expect(fs.existsSync(path.join(repoRoot, "3Dend"))).toBe(false);
		expect(fs.existsSync(path.join(repoRoot, "Dockerfile.web"))).toBe(false);
		expect(fs.existsSync(path.join(repoRoot, "nginx.web.conf"))).toBe(false);
		expect(
			fs.existsSync(path.join(repoRoot, "scripts/inject-prefetch.cjs")),
		).toBe(false);
	});
});
