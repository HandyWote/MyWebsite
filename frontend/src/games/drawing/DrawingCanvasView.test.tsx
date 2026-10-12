import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperGameHost } from "../host";
import { DrawingCanvasView } from "./DrawingCanvasView";

function jsonResponse(status: number, body: unknown): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response;
}

const STUB_HOST: PaperGameHost = {
	mount: () => {},
	unmount: () => {},
	getSize: () => ({ width: 0, height: 0 }),
};

const CANVAS_STROKES = [
	{
		id: "pub1",
		color: "#e63946",
		width: 0.02,
		points: [
			{ x: 0.1, y: 0.1, t: 1 },
			{ x: 0.5, y: 0.5, t: 2 },
		],
	},
];

beforeEach(() => {
	vi.stubGlobal("fetch", vi.fn());
	// jsdom 无布局：容器 rect 宽高为 0，渲染 effect 会跳过（canvas 尺寸
	// 断言只证明「笔画存在时不跳过渲染管线」，真实尺寸走 ResizeObserver）。
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		arc: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("DrawingCanvasView", () => {
	it("shows a minimal loading placeholder before the canvas resolves", async () => {
		let releaseFetch: (value: Response) => void = () => {};
		vi.mocked(fetch).mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					releaseFetch = resolve;
				}),
		);
		render(<DrawingCanvasView host={STUB_HOST} />);
		expect(screen.getByText("loading canvas…")).toBeTruthy();
		act(() => {
			releaseFetch(
				jsonResponse(200, { code: 0, data: { version: 1, strokes: CANVAS_STROKES, updated_at: "" } }),
			);
		});
		await waitFor(() => {
			expect(screen.queryByText("loading canvas…")).toBeNull();
		});
	});

	it("renders the fetched strokes statically and hides the empty hint", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(200, {
				code: 0,
				data: { version: 3, strokes: CANVAS_STROKES, updated_at: "" },
			}),
		);

		const { container } = render(<DrawingCanvasView host={STUB_HOST} />);
		// 挂载即拉公共画布
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				"/api/games/drawing/canvas",
				expect.anything(),
			);
		});
		// 有笔画：canvas 渲染、无空态提示、容器带查看模式契约属性
		await waitFor(() => {
			expect(container.querySelector("canvas")).not.toBeNull();
		});
		expect(container.querySelector("[data-canvas-view]")).not.toBeNull();
		expect(container.querySelector("[data-canvas-empty]")).toBeNull();
		expect(screen.queryByText("the canvas is empty — be the first to draw")).toBeNull();
		// 渲染管线确实跑了（jsdom 无布局会跳过绘制——这里 rect 宽高为 0，
		// 所以只断言画布节点就位；绘制逻辑由 drawingCanvas.test 覆盖）
		expect(
			container.querySelector('canvas[aria-label="Public drawing canvas"]'),
		).not.toBeNull();
	});

	it("shows the empty-canvas hint for version 0 without strokes", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } }),
		);

		const { container } = render(<DrawingCanvasView host={STUB_HOST} />);
		await waitFor(() => {
			expect(screen.getByText("the canvas is empty — be the first to draw")).toBeTruthy();
		});
		expect(container.querySelector("[data-canvas-empty]")).not.toBeNull();
		// 空画布没有 canvas 层
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("shows the failure hint when the fetch errors", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("network down"));

		const { container } = render(<DrawingCanvasView host={STUB_HOST} />);
		await waitFor(() => {
			expect(screen.getByText("canvas unavailable — try again later")).toBeTruthy();
		});
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-canvas-empty]")).toBeNull();
	});

	it("treats non-ok responses as the failure state", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(500, { message: "boom" }));

		const { container } = render(<DrawingCanvasView host={STUB_HOST} />);
		await waitFor(() => {
			expect(screen.getByText("canvas unavailable — try again later")).toBeTruthy();
		});
		expect(container.querySelector("canvas")).toBeNull();
	});
});
