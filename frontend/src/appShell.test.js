import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PublicLayout from "../app/(public)/layout";

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
});
