import {
	act,
	cleanup,
	createEvent,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
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

/**
 * 派发带 offsetX/offsetY 覆写的 pointer 事件。
 * jsdom 的 PointerEvent 构造器不接受这两个 init（其原型 getter 只会
 * 退回 clientX/clientY），只能在事件实例上 defineProperty 覆写；
 * offset 传 undefined 即可模拟旧环境/合成事件没有 offset 的 fallback。
 */
function firePointerWithOffset(
	node: HTMLElement,
	type: "pointerDown" | "pointerMove" | "pointerUp",
	offset: { x: number | undefined; y: number | undefined },
	client: { x: number; y: number },
	init: Record<string, unknown> = {},
) {
	const event = createEvent[type](
		node,
		pointerInit({ clientX: client.x, clientY: client.y, ...init }),
	);
	Object.defineProperty(event, "offsetX", { value: offset.x });
	Object.defineProperty(event, "offsetY", { value: offset.y });
	return fireEvent(node, event);
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

	it("prefers offsetX/offsetY over the rect mapping when they disagree", () => {
		renderBoard();
		const node = canvas();
		// 变换后的纸面上 AABB rect ≠ 元素四边形：rect（800×600 @ 0,0）把
		// client (100,50) 线性映射到 (0.125, 0.083)，而逆投影 offset
		// (400,300)/(500,360) 映射到 (0.5, 0.5)/(0.625, 0.6)——断言笔触跟随
		// offset。jsdom 无布局（clientWidth=0），尺寸回退 rect（800×600）。
		firePointerWithOffset(node, "pointerDown", { x: 400, y: 300 }, { x: 100, y: 50 });
		firePointerWithOffset(
			node,
			"pointerMove",
			{ x: 500, y: 360 },
			{ x: 200, y: 100 },
			{ buttons: 1 },
		);
		firePointerWithOffset(node, "pointerUp", { x: 500, y: 360 }, { x: 200, y: 100 });
		expect(strokeCount()).toBe(1);
		expect(calls).toContain("moveTo 400,300");
		expect(calls).toContain("lineTo 500,360");
		expect(calls).not.toContain("moveTo 100,50");
		expect(calls).not.toContain("lineTo 200,100");
	});

	it("divides offsets by the canvas layout size, not the bounding rect", () => {
		renderBoard();
		const node = canvas();
		// 显式提供布局尺寸 400×300（rect 仍为 800×600）：offset (100,150)
		// 应归一化为 (0.25, 0.5) → 渲染回 (200, 300)；若误用 rect 尺寸
		// 则会得到 (100, 150)。
		Object.defineProperty(node, "clientWidth", {
			value: 400,
			configurable: true,
		});
		Object.defineProperty(node, "clientHeight", {
			value: 300,
			configurable: true,
		});
		firePointerWithOffset(node, "pointerDown", { x: 100, y: 150 }, { x: 100, y: 150 });
		firePointerWithOffset(node, "pointerUp", { x: 100, y: 150 }, { x: 100, y: 150 });
		expect(strokeCount()).toBe(1);
		expect(calls).toContain("arc 200,300,16.5,0,6.283185307179586");
	});

	it("falls back to clientX + rect mapping when offsets are unavailable", () => {
		renderBoard();
		const node = canvas();
		// 旧环境/合成事件可能没有 offset：覆写为 undefined 强制走 fallback；
		// rect 带非零偏移以证明 clientX/Y + rect 线性映射被使用。
		vi.spyOn(
			HTMLCanvasElement.prototype,
			"getBoundingClientRect",
		).mockReturnValue({
			...CANVAS_RECT,
			left: 40,
			top: 20,
		} as DOMRect);
		firePointerWithOffset(
			node,
			"pointerDown",
			{ x: undefined, y: undefined },
			{ x: 140, y: 70 },
		);
		firePointerWithOffset(
			node,
			"pointerUp",
			{ x: undefined, y: undefined },
			{ x: 140, y: 70 },
		);
		expect(strokeCount()).toBe(1);
		// (140-40)/800 = 0.125, (70-20)/600 = 0.0833 → 渲染回 (100, 50)
		expect(calls).toContain("arc 100,50,16.5,0,6.283185307179586");
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

	it("silently restores an existing draft and shows a buttonless toast", () => {
		vi.useFakeTimers();
		try {
			window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
			renderBoard();

			// 静默恢复：挂载即载入草稿笔画，立即可继续画
			expect(strokeCount()).toBe(sampleDraft.strokes.length);
			const toast = document.querySelector('[data-draft-toast="restored"]');
			expect(toast).not.toBeNull();
			expect(toast?.getAttribute("role")).toBe("status");
			expect(toast?.getAttribute("aria-live")).toBe("polite");
			expect(toast?.textContent).toBe(
				"Restored your last doodle — saved on this device",
			);
			// 恢复本身不写盘：storage 保持原始草稿内容
			expect(window.localStorage.getItem(DRAFT_KEY)).toBe(
				JSON.stringify(sampleDraft),
			);
			// 无按钮模态：不存在任何草稿操作按钮
			expect(document.querySelectorAll("[data-draft-action]")).toHaveLength(0);

			// 4s 后自动消失
			act(() => {
				vi.advanceTimersByTime(4000);
			});
			expect(
				document.querySelector('[data-draft-toast="restored"]'),
			).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not show the toast without a draft or for an empty draft", () => {
		renderBoard();
		expect(document.querySelector('[data-draft-toast="restored"]')).toBeNull();
		expect(strokeCount()).toBe(0);
		cleanup();

		window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ strokes: [] }));
		renderBoard();
		expect(document.querySelector('[data-draft-toast="restored"]')).toBeNull();
		expect(strokeCount()).toBe(0);
	});

	it("clearing the canvas removes the draft from storage", () => {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		renderBoard();
		expect(strokeCount()).toBe(1);

		fireEvent.click(screen.getByRole("button", { name: "Clear canvas" }));
		expect(strokeCount()).toBe(0);
		// 清空 = 弃稿：storage 不留空数组
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();

		// 卸载 flushDraft 也不把空状态写回
		cleanup();
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
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
