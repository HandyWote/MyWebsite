import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getArticlePageMock } = vi.hoisted(() => ({
	getArticlePageMock: vi.fn(),
}));

// 边界 mock:404 页是服务端渲染的静态壳,getArticlePage 只被 PublicShell
// 这类服务端组件消费,客户端测试跑不到真实请求,返回空页即可。
vi.mock("@/api/publicApi.server", () => ({
	getArticlePage: getArticlePageMock,
}));

// useSession 真实实现挂载即触发 authApi.me(),jsdom 下无后端,降级为 guest 边界。
vi.mock("@/hooks/useSession", () => ({
	useSession: () => ({
		status: "guest",
		user: null,
		login: vi.fn(),
		logout: vi.fn(),
		refresh: vi.fn(),
	}),
}));

// jsdom 无 app router 挂载,useRouter/usePathname 不可用(与 PublicShell.test 同款边界 mock);
// 404 页无路由跳转,静态返回即可。
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}));

import NotFoundPage from "./not-found";

describe("not-found page", () => {
	beforeEach(() => {
		getArticlePageMock.mockReset();
		getArticlePageMock.mockResolvedValue({ items: [] });
	});

	it("renders the 404 page with real terminal components", async () => {
		const { container } = render(await NotFoundPage());

		// TerminalNotFound(真实组件):cat 报错与 figlet 标题
		expect(
			screen.getByText("cat: /: No such file or directory"),
		).toBeInTheDocument();
		expect(screen.getByTestId("terminal-404-ascii")).toBeInTheDocument();

		// did you mean 建议(抽一条:cd games/ 链接指向 /games)
		expect(screen.getByText("did you mean:")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "cd games/" }),
		).toHaveAttribute("href", "/games");

		// 底部命令栏(真实 TerminalCommandBar)
		expect(
			screen.getByLabelText("Terminal command"),
		).toBeInTheDocument();

		// 404 页无 explorer 侧栏
		expect(screen.queryByText("explorer")).not.toBeInTheDocument();

		expect(container).toBeInTheDocument();
	});
});
