import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperGameHost } from "../host";
import type { Drawing } from "../types";
import { clearDraft as resetDraftModule, DRAFT_KEY } from "./draftStore";
import { DrawingGame } from "./DrawingGame";

const PAPER_SIZE = { width: 800, height: 600 };

/** 可断言的 CanvasRenderingContext2D mock（jsdom 无 2D 实现）。 */
function createMockContext() {
	const calls: string[] = [];
	const ctx = {
		lineCap: "butt",
		lineJoin: "miter",
		lineWidth: 1,
		strokeStyle: "#000",
		fillStyle: "#000",
		globalCompositeOperation: "source-over",
		setTransform: vi.fn(() => {
			calls.push("setTransform");
		}),
		clearRect: vi.fn((...args: number[]) => {
			calls.push(`clearRect ${args.join(",")}`);
		}),
		beginPath: vi.fn(() => {
			calls.push("beginPath");
		}),
		moveTo: vi.fn((...args: number[]) => {
			calls.push(`moveTo ${args.join(",")}`);
		}),
		lineTo: vi.fn((...args: number[]) => {
			calls.push(`lineTo ${args.join(",")}`);
		}),
		arc: vi.fn((...args: number[]) => {
			calls.push(`arc ${args.join(",")}`);
		}),
		stroke: vi.fn(() => {
			calls.push("stroke");
		}),
		fill: vi.fn(() => {
			calls.push("fill");
		}),
	} as unknown as CanvasRenderingContext2D;
	return { ctx, calls };
}

function createStubHost(size = PAPER_SIZE): PaperGameHost {
	return {
		mount: vi.fn(),
		unmount: vi.fn(),
		getSize: () => ({ ...size }),
	};
}

/** canvas 的屏幕矩形（clientX/Y → 0-1 归一化用）。 */
const CANVAS_RECT = {
	x: 0,
	y: 0,
	left: 0,
	top: 0,
	right: PAPER_SIZE.width,
	bottom: PAPER_SIZE.height,
	width: PAPER_SIZE.width,
	height: PAPER_SIZE.height,
	toJSON: () => ({}),
} as DOMRect;

let mockCtx: ReturnType<typeof createMockContext>["ctx"];
let calls: string[];

beforeEach(() => {
	// 清掉 draftStore 模块级防抖计时器/未决写，防止上个用例的计时器在本用例中途落盘
	resetDraftModule();
	const context = createMockContext();
	mockCtx = context.ctx;
	calls = context.calls;
	vi.spyOn(
		HTMLCanvasElement.prototype,
		"getContext",
	).mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
	vi.spyOn(
		HTMLCanvasElement.prototype,
		"getBoundingClientRect",
	).mockReturnValue(CANVAS_RECT);
	window.localStorage.clear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.localStorage.clear();
});

function renderBoard(host?: PaperGameHost) {
	return render(<DrawingGame host={host ?? createStubHost()} />);
}

function board(): HTMLElement {
	const node = document.querySelector('[data-game="drawing"]');
	if (!node) throw new Error("drawing board root not found");
	return node as HTMLElement;
}

function strokeCount(): number {
	return Number(board().getAttribute("data-stroke-count"));
}

function canvas(): HTMLCanvasElement {
	const node = document.querySelector("canvas");
	if (!node) throw new Error("canvas not found");
	return node;
}

function pointerInit(overrides: Record<string, unknown> = {}) {
	return {
		bubbles: true,
		button: 0,
		isPrimary: true,
		pointerId: 1,
		...overrides,
	};
}

function drawStroke(from = { x: 100, y: 50 }, to = { x: 200, y: 100 }) {
	const node = canvas();
	fireEvent.pointerDown(node, pointerInit({ clientX: from.x, clientY: from.y }));
	fireEvent.pointerMove(node, pointerInit({ clientX: to.x, clientY: to.y, buttons: 1 }));
	fireEvent.pointerUp(node, pointerInit({ clientX: to.x, clientY: to.y }));
}

function tap(point = { x: 100, y: 50 }) {
	const node = canvas();
	fireEvent.pointerDown(node, pointerInit({ clientX: point.x, clientY: point.y }));
	fireEvent.pointerUp(node, pointerInit({ clientX: point.x, clientY: point.y }));
}

const sampleDraft: Drawing = {
	strokes: [
		{
			id: "d1",
			color: "#264653",
			width: 0.02,
			points: [
				{ x: 0.1, y: 0.1, t: 1 },
				{ x: 0.2, y: 0.2, t: 2 },
			],
		},
	],
};

describe("DrawingGame", () => {
	it("renders the board root with the e2e data contract and a sized canvas", () => {
		renderBoard();
		expect(board().dataset.game).toBe("drawing");
		expect(board().getAttribute("data-stroke-count")).toBe("0");
		// canvas 铺满宿主，按 size × dpr 设置设备尺寸（jsdom dpr = 1）
		expect(canvas().width).toBe(800);
		expect(canvas().height).toBe(600);
		// 初始全量重绘：清屏一次
		expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
	});

	it("exposes the toolbar with the documented data attributes", () => {
		renderBoard();
		expect(document.querySelectorAll('[data-tool="color"]')).toHaveLength(8);
		expect(
			document.querySelector('[data-tool="color"][data-color="#264653"]'),
		).not.toBeNull();
		expect(document.querySelectorAll('[data-tool="width"]')).toHaveLength(3);
		expect(
			document.querySelector('[data-tool="width"][data-width="0.02"]'),
		).not.toBeNull();
		expect(document.querySelector('[data-tool="eraser"]')).not.toBeNull();
		expect(
			document.querySelector('[data-action="undo"]') as HTMLButtonElement,
		).toBeDisabled();
		expect(
			document.querySelector('[data-action="redo"]') as HTMLButtonElement,
		).toBeDisabled();
		expect(
			document.querySelector('[data-action="clear"]') as HTMLButtonElement,
		).toBeDisabled();
		const submit = document.querySelector(
			'[data-action="submit"]',
		) as HTMLButtonElement;
		expect(submit.disabled).toBe(true);
		expect(submit.title).toContain("P1");
	});

	it("draws a stroke from pointer events and commits it on pointer up", () => {
		renderBoard();
		drawStroke();

		expect(strokeCount()).toBe(1);
		// 进行中笔画渲染在 pointerup 前已发生（完整笔画绘制）
		expect(calls).toContain("moveTo 100,50");
		expect(calls).toContain("lineTo 200,100");
		expect(calls).toContain("stroke");
		// 默认笔宽 0.055 × min(800, 600) = 33
		expect(mockCtx.lineWidth).toBe(33);
	});

	it("keeps the stroke uncommitted until pointer up", () => {
		renderBoard();
		const node = canvas();
		fireEvent.pointerDown(node, pointerInit({ clientX: 100, clientY: 50 }));
		fireEvent.pointerMove(node, pointerInit({ clientX: 200, clientY: 100, buttons: 1 }));
		expect(strokeCount()).toBe(0);

		fireEvent.pointerUp(node, pointerInit({ clientX: 200, clientY: 100 }));
		expect(strokeCount()).toBe(1);
	});

	it("renders a single-point tap as a dot", () => {
		renderBoard();
		tap();
		expect(strokeCount()).toBe(1);
		expect(calls).toContain("arc 100,50,16.5,0,6.283185307179586");
		expect(calls).toContain("fill");
	});

	it("undoes, redoes and clears with history snapshots", () => {
		renderBoard();
		drawStroke();
		drawStroke({ x: 300, y: 200 }, { x: 400, y: 250 });
		expect(strokeCount()).toBe(2);

		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		expect(strokeCount()).toBe(1);
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		expect(strokeCount()).toBe(0);

		fireEvent.click(screen.getByRole("button", { name: "Redo" }));
		expect(strokeCount()).toBe(1);
		// 新笔画清空 redo 栈
		drawStroke();
		expect(strokeCount()).toBe(2);
		expect(
			(document.querySelector('[data-action="redo"]') as HTMLButtonElement)
				.disabled,
		).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
		expect(strokeCount()).toBe(0);
		// 清空入历史：可撤销恢复
		fireEvent.click(screen.getByRole("button", { name: "Undo" }));
		expect(strokeCount()).toBe(2);
	});

	it("toggles the eraser and draws sentinel-colored strokes", () => {
		renderBoard();
		const eraser = screen.getByRole("button", { name: "Eraser" });
		expect(eraser.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(eraser);
		expect(eraser.getAttribute("aria-pressed")).toBe("true");

		// 选中颜色退出橡皮模式
		fireEvent.click(
			screen.getByRole("button", { name: "Brush color #264653" }),
		);
		expect(
			screen.getByRole("button", { name: "Eraser" }).getAttribute(
				"aria-pressed",
			),
		).toBe("false");

		// 橡皮笔画落盘为哨兵色
		fireEvent.click(screen.getByRole("button", { name: "Eraser" }));
		drawStroke();
		cleanup(); // 卸载触发 flushDraft
		const saved = JSON.parse(
			window.localStorage.getItem(DRAFT_KEY) ?? "null",
		) as Drawing;
		expect(saved.strokes[0].color).toBe("__eraser__");
	});

	it("autosaves relative-coordinate strokes and flushes on unmount", () => {
		renderBoard();
		drawStroke();
		cleanup();

		const saved = JSON.parse(
			window.localStorage.getItem(DRAFT_KEY) ?? "null",
		) as Drawing;
		expect(saved.strokes).toHaveLength(1);
		expect(saved.strokes[0].points.length).toBeGreaterThanOrEqual(2);
		for (const point of saved.strokes[0].points) {
			expect(point.x).toBeGreaterThanOrEqual(0);
			expect(point.x).toBeLessThanOrEqual(1);
			expect(point.y).toBeGreaterThanOrEqual(0);
			expect(point.y).toBeLessThanOrEqual(1);
			expect(typeof point.t).toBe("number");
		}
	});

	it("does not write a draft when the user never drew", () => {
		renderBoard();
		cleanup();
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
	});

	it("offers continue/discard for an existing draft", () => {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		renderBoard();

		const continueButton = document.querySelector(
			'[data-draft-action="continue"]',
		);
		expect(continueButton).not.toBeNull();

		fireEvent.click(continueButton as HTMLButtonElement);
		expect(strokeCount()).toBe(1);
		expect(document.querySelector('[data-draft-action="continue"]')).toBeNull();
	});

	it("discards the draft and clears storage", () => {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		renderBoard();

		fireEvent.click(
			document.querySelector('[data-draft-action="discard"]') as HTMLButtonElement,
		);
		expect(strokeCount()).toBe(0);
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
		expect(
			document.querySelector('[data-draft-action="discard"]'),
		).toBeNull();
	});

	it("recovers a zero initial host size via ResizeObserver", () => {
		let observerCallback: ResizeObserverCallback | undefined;
		class FakeResizeObserver {
			constructor(callback: ResizeObserverCallback) {
				observerCallback = callback;
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		vi.stubGlobal("ResizeObserver", FakeResizeObserver);

		renderBoard(createStubHost({ width: 0, height: 0 }));
		// size 0 → 跳过渲染（canvas 保持 HTML 默认尺寸，未清屏）
		expect(mockCtx.clearRect).not.toHaveBeenCalled();
		expect(canvas().width).toBe(300);

		// PaperScreen 接管后 RO 触发
		act(() => {
			observerCallback?.(
				[
					{
						contentRect: { width: 400, height: 300 },
					} as ResizeObserverEntry,
				],
				{} as ResizeObserver,
			);
		});
		expect(canvas().width).toBe(400);
		expect(canvas().height).toBe(300);
		expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 400, 300);
	});
});
