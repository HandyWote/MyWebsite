import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameDetailView } from "./GameDetailView";

/**
 * 查看模式客户端分派（工单 #9 T10a）的行为测试：page.tsx（Server
 * Component）只传 gameId 字符串，分派组件在 client 侧从注册表解引用
 * DetailView。断言用户可见的渲染结果，不断言内部调用序列。
 */

function jsonResponse(status: number, body: unknown): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response;
}

beforeEach(() => {
	vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("GameDetailView", () => {
	it("renders the read-only canvas for drawing (registry DetailView resolved client-side)", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(200, {
				code: 0,
				data: { version: 3, strokes: [], updated_at: "" },
			}),
		);

		const { container } = render(<GameDetailView gameId="drawing" />);
		// DrawingCanvasView 挂载后拉公共画布并渲染只读画布契约属性
		await waitFor(() => {
			expect(container.querySelector("[data-canvas-view]")).not.toBeNull();
		});
		// 请求确实来自画布查看视图（客户端 fetch 公共画布接口）
		expect(fetch).toHaveBeenCalledWith(
			"/api/games/drawing/canvas",
			expect.anything(),
		);
	});

	it("shows the desktop-only placeholder text for games without DetailView", () => {
		// 注册表当前只有 drawing（desktopOnly，无第二游戏）；用未注册 id
		// 触达同一条无-DetailView 兜底分支（页面对未知 id 会先 404，但分派
		// 组件自身必须保持该兜底，供未来注册 desktopOnly 游戏复用）。
		render(<GameDetailView gameId="not-a-game" />);
		expect(
			screen.getByText(/需要桌面 3D 纸面体验/),
		).toBeTruthy();
	});
});
