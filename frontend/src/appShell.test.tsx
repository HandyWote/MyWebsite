import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PublicLayout from "../app/(public)/layout";
import nextConfig from "../next.config";

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

	it("keeps permanent redirects for legacy /app routes", async () => {
		// 路由行为测试：直接调用默认导出配置对象上的 redirects()（TS 允许调用对象属性方法，
		// 导入该文件仅有对象定义、无副作用），断言配置模块的公开契约，实现文件零改动。
		// 删除/改坏任一规则（source、destination、permanent）都会让本测试变红。
		const rules = await nextConfig.redirects?.() ?? [];

		expect(rules).toContainEqual({ source: "/app", destination: "/", permanent: true });
		expect(rules).toContainEqual({
			source: "/app/articles",
			destination: "/articles",
			permanent: true,
		});
		expect(rules).toContainEqual({
			source: "/app/articles/:id",
			destination: "/articles/:id",
			permanent: true,
		});
		expect(rules).toContainEqual({
			source: "/app/projects",
			destination: "/projects",
			permanent: true,
		});
		expect(rules).toContainEqual({
			source: "/app/admin/:path*",
			destination: "/admin/:path*",
			permanent: true,
		});
	});
});
