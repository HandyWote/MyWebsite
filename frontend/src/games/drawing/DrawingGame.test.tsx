import {
	act,
	cleanup,
	createEvent,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperGameHost } from "../host";
import type { Drawing, Stroke } from "../types";
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
	// P1：挂载会拉公共画布，fetch 一律 mock（默认空画布 v0）
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({
			code: 0,
			data: { version: 0, strokes: [], updated_at: "" },
		}),
	}));
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

/** 工具栏默认收起：需要与工具交互的用例先点开关钮展开。 */
function openTools(): void {
	fireEvent.click(screen.getByRole("button", { name: "Show drawing tools" }));
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

/** 最新 toast（提交链各分支共用容器，按递增序号取最新一条）。 */
function lastToast(): HTMLElement | null {
	const nodes = document.querySelectorAll("[data-toast]");
	if (nodes.length === 0) return null;
	return nodes[nodes.length - 1] as HTMLElement;
}

function submitButton(): HTMLButtonElement {
	const node = document.querySelector(
		'[data-action="submit"]',
	) as HTMLButtonElement;
	if (!node) throw new Error("submit button not found");
	return node;
}

/** guest 点击：不等待会话（guest 分支与会话状态无关）。 */
async function clickSubmitAsGuest() {
	openTools();
	fireEvent.click(submitButton());
	await waitFor(() => {
		expect(
			document.querySelector('[data-toast="sign-in"]'),
		).not.toBeNull();
	});
}

/** authed 点击：等会话链 settle（me 返回 authed）再点，等提交链 settle。 */
async function clickSubmitAsAuthed() {
	openTools();
	// 会话状态由微任务链 settle（token → me()）：必须等 authed 再点，
	// 否则 guest 早退弹 sign-in 引导而非走提交链。恢复 toast 属正常态。
	await waitFor(() => {
		expect(board().getAttribute("data-session")).toBe("authed");
	});
	fireEvent.click(submitButton());
	await waitFor(() => {
		expect(submitButton().getAttribute("aria-busy")).toBe("false");
		expect(submitButton().disabled).toBe(false);
	});
}

/** 预置 authed 会话：localStorage 带 token，/api/auth/me 返回用户。 */
function mockAuthedSession() {
	window.localStorage.setItem("token", "jwt-token");
	vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url === "/api/auth/me") {
			return {
				ok: true,
				status: 200,
				json: async () => ({
					code: 0,
					data: { username: "octocat", provider: "github" },
				}),
			} as Response;
		}
		return {
			ok: true,
			status: 200,
			json: async () => ({
				code: 0,
				data: { version: 0, strokes: [], updated_at: "" },
			}),
		} as Response;
	});
}

function jsonResponse(status: number, body: unknown): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response;
}

/** POST /api/games/drawing/canvas 的响应 mock（保留画布拉取默认值）。 */
function mockSubmitResponse(status: number, body: unknown): void {
	vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url === "/api/games/drawing/canvas") {
			return jsonResponse(status, body);
		}
		if (url === "/api/auth/me") {
			return jsonResponse(200, {
				code: 0,
				data: { username: "octocat", provider: "github" },
			});
		}
		return jsonResponse(200, {
			code: 0,
			data: { version: 0, strokes: [], updated_at: "" },
		});
	});
}

/** 最近一次 POST canvas 的请求体。 */
function lastSubmitBody(): { base_version: number | undefined; strokes: Stroke[] } {
	const postCalls = vi
		.mocked(fetch)
		.mock.calls.filter(
			([input, init]) =>
				String(input) === "/api/games/drawing/canvas" &&
				(init as RequestInit | undefined)?.method === "POST",
		);
	const init = postCalls[postCalls.length - 1]?.[1] as RequestInit;
	return JSON.parse(String(init.body));
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
		openTools();
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

		// P1 红灯基线（行为变化）：提交按钮不再是 disabled 占位；
		// guest 点击显示登录引导 toast，且不发出任何网络请求。
		const submit = submitButton();
		expect(submit.disabled).toBe(false);
		fireEvent.click(submit);
		expect(
			document.querySelector('[data-toast="sign-in"]')?.textContent,
		).toBe("sign in to submit — $ login");
		// guest 不发任何请求：fetch 调用次数在点击前后不变（挂载的画布
		// GET 已在渲染时发出，与点击无关）
		const callsBefore = vi.mocked(fetch).mock.calls.length;
		fireEvent.click(submit);
		expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
	});

	it("collapses the toolbar by default and toggles it via the corner switch", () => {
		renderBoard();
		// 默认收起：卡缩成只剩开关钮的小扁胶囊，工具行宽 0 且退出
		// 无障碍树（visibility hidden + 无 toolbar role）
		const toggle = screen.getByRole("button", { name: "Show drawing tools" });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(toggle.getAttribute("aria-controls")).toBe("drawing-toolbar");
		expect(screen.queryByRole("toolbar")).toBeNull();
		const row = document.getElementById("drawing-toolbar")
			?.firstElementChild as HTMLElement;
		expect(row.style.maxWidth).toBe("0px");
		expect(row.style.visibility).toBe("hidden");

		// 展开：原地丝滑展开为单行面板（max-width/opacity/visibility 过渡）
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("toolbar")).toBeTruthy();
		expect(row.style.maxWidth).toBe("560px");
		expect(row.style.visibility).toBe("visible");

		// 再点（标签已翻转为 Hide）收起
		fireEvent.click(screen.getByRole("button", { name: "Hide drawing tools" }));
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("toolbar")).toBeNull();
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
		openTools();
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
		openTools();
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
			const toast = document.querySelector('[data-toast="restored"]');
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
			expect(document.querySelector('[data-toast="restored"]')).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not show the toast without a draft or for an empty draft", () => {
		renderBoard();
		expect(document.querySelector('[data-toast="restored"]')).toBeNull();
		expect(strokeCount()).toBe(0);
		cleanup();

		window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ strokes: [] }));
		renderBoard();
		expect(document.querySelector('[data-toast="restored"]')).toBeNull();
		expect(strokeCount()).toBe(0);
	});

	it("clearing the canvas removes the draft from storage", () => {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		renderBoard();
		expect(strokeCount()).toBe(1);

		openTools();
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

describe("DrawingGame public canvas (P1)", () => {
	it("fetches the public canvas on mount and renders it under the local strokes", async () => {
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
			if (String(input) === "/api/games/drawing/canvas") {
				return jsonResponse(200, {
					code: 0,
					data: {
						version: 3,
						strokes: [
							{
								id: "pub1",
								color: "#e63946",
								width: 0.02,
								points: [
									{ x: 0.05, y: 0.05, t: 1 },
									{ x: 0.15, y: 0.05, t: 2 },
								],
							},
						],
						updated_at: "2026-01-01T00:00:00Z",
					},
				});
			}
			return jsonResponse(200, {
				code: 0,
				data: { username: "octocat", provider: "github" },
			});
		});
		window.localStorage.setItem("token", "jwt-token");

		renderBoard();
		// 公共底层落位：base 笔画出现在渲染调用里（(0.05×800, 0.05×600)）
		await waitFor(() => {
			expect(calls).toContain("moveTo 40,30");
		});
		// data-canvas-version 随快照渲染更新（DOM 属性是最终真相）
		await waitFor(() => {
			expect(board().getAttribute("data-canvas-version")).toBe("3");
		});
		// 公共画布不占本地增量计数
		expect(strokeCount()).toBe(0);
	});

	it("degrades to a purely local render when the canvas fetch fails", () => {
		vi.mocked(fetch).mockRejectedValue(new Error("offline"));
		renderBoard();
		// 拉取失败不崩、不弹错，纯本地渲染照常
		drawStroke();
		expect(strokeCount()).toBe(1);
		expect(calls).toContain("moveTo 100,50");
		expect(board().getAttribute("data-canvas-version")).toBe("");
	});

	it("keeps a legacy P0 draft (no base_version) and posts it with the fetched base", async () => {
		// 旧 P0 草稿：无 base_version 字段；画布当前版本 5
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		window.localStorage.setItem("token", "jwt-token");
		const originalFetch = vi.mocked(fetch).getMockImplementation();
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				return jsonResponse(200, { code: 0, data: { version: 6, status: "published" } });
			}
			if (url === "/api/games/drawing/canvas") {
				return jsonResponse(200, { code: 0, data: { version: 5, strokes: [], updated_at: "" } });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return originalFetch?.(input, init) as Promise<Response>;
		});

		renderBoard();
		// 旧草稿完整恢复，笔画不丢
		expect(strokeCount()).toBe(1);
		await clickSubmitAsAuthed();

		// 提交体：base 取拉到的画布版本 5，增量是整幅旧草稿
		expect(lastSubmitBody()).toEqual({
			base_version: 5,
			strokes: sampleDraft.strokes,
		});
		// published：清增量、base 对齐新版本
		expect(lastToast()?.textContent).toBe("published to the canvas");
		expect(strokeCount()).toBe(0);
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
		expect(board().getAttribute("data-canvas-version")).toBe("6");
	});

	it("keeps the stored base_version when the canvas fetch fails (offline resubmit)", async () => {
		// 已提交过（增量已保存带 base_version=3）的草稿 + 画布拉取失败：
		// 提交时用存储的 base_version，不再因拉取失败而丢提交机会
		window.localStorage.setItem(
			DRAFT_KEY,
			JSON.stringify({ base_version: 3, strokes: sampleDraft.strokes }),
		);
		window.localStorage.setItem("token", "jwt-token");
		let canvasGets = 0;
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				return jsonResponse(200, { code: 0, data: { version: 4, status: "published" } });
			}
			if (url === "/api/games/drawing/canvas") {
				canvasGets += 1;
				if (canvasGets === 1) {
					// 挂载拉取失败（getCanvas 对 5xx 自动重试一次）
					return jsonResponse(500, { message: "down" });
				}
				return jsonResponse(500, { message: "down" });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});

		renderBoard();
		// 草稿恢复，纯本地渲染（拉取失败降级）
		expect(strokeCount()).toBe(1);
		await clickSubmitAsAuthed();

		// 提交体用的是存储的 base_version=3（未因拉取失败而放弃对齐）
		expect(lastSubmitBody()).toEqual({
			base_version: 3,
			strokes: sampleDraft.strokes,
		});
		expect(lastToast()?.textContent).toBe("published to the canvas");
	});

	it("guest submit shows the sign-in hint and fires no network request", async () => {
		renderBoard();
		drawStroke();
		const callsBefore = vi.mocked(fetch).mock.calls.length;
		await clickSubmitAsGuest();

		expect(lastToast()?.textContent).toBe("sign in to submit — $ login");
		expect(lastToast()?.getAttribute("data-toast")).toBe("sign-in");
		// 点击未新增任何 fetch 调用（挂载的画布 GET 在点击前已发出）
		expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
	});

	it("authed submit with 200 publishes, clears the local increment and aligns base_version", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(200, { code: 0, data: { version: 4, status: "published" } });
		await clickSubmitAsAuthed();

		// base 取挂载时拉到的 0；published 后增量清空、base 对齐 4
		expect(lastSubmitBody()).toEqual({
			base_version: 0,
			strokes: expect.any(Array) as unknown as Stroke[],
		});
		expect(lastToast()?.textContent).toBe("published to the canvas");
		expect(lastToast()?.getAttribute("data-toast")).toBe("published");
		expect(strokeCount()).toBe(0);
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
		await waitFor(() => {
			expect(board().getAttribute("data-canvas-version")).toBe("4");
		});
	});

	it("authed submit with 202 keeps strokes cleared and toasts submitted for review", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(202, {
			code: 0,
			data: { status: "pending", submission_id: 12 },
		});
		await clickSubmitAsAuthed();

		expect(lastToast()?.textContent).toBe("submitted for review");
		expect(lastToast()?.getAttribute("data-toast")).toBe("pending");
		expect(strokeCount()).toBe(0);
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
	});

	it("authed submit with 422 ocr/graphic reasons shows the matching rejection copy", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(422, { error: "rejected", reason: "ocr" });
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("rejected: looks like text");
		expect(lastToast()?.getAttribute("data-toast")).toBe("rejected");
		// 拒绝不误清本地笔画；再画一笔（重置到稳定态）后验证 graphic 分支
		expect(strokeCount()).toBe(1);
		cleanup();

		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDraft));
		mockSubmitResponse(422, { error: "rejected", reason: "graphic" });
		renderBoard();
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("rejected: looks like symbols");
		expect(strokeCount()).toBe(1);
	});

	it("authed submit with 429 toasts slow down", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(429, { error: "提交过于频繁,请稍后再试" });
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("slow down — try again later");
		expect(lastToast()?.getAttribute("data-toast")).toBe("rate-limited");
		// 限流不误清本地笔画
		expect(strokeCount()).toBe(1);
	});

	it("network failure toasts submission failed and keeps strokes", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			if (init?.method === "POST") throw new Error("network down");
			if (String(input) === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("submission failed — try again");
		expect(strokeCount()).toBe(1);
	});

	it("on 409 refetches the canvas and auto-resubmits once with the new base", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		let postCount = 0;
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				postCount += 1;
				if (postCount === 1) {
					return jsonResponse(409, { error: "version conflict", current_version: 5 });
				}
				return jsonResponse(200, { code: 0, data: { version: 6, status: "published" } });
			}
			if (url === "/api/games/drawing/canvas") {
				return jsonResponse(200, { code: 0, data: { version: 5, strokes: [], updated_at: "" } });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});
		await clickSubmitAsAuthed();

		expect(postCount).toBe(2);
		// 重提用的 base 是重拉到的 5
		expect(lastSubmitBody()).toEqual({
			base_version: 5,
			strokes: expect.any(Array) as unknown as Stroke[],
		});
		expect(lastToast()?.textContent).toBe("published to the canvas");
		expect(board().getAttribute("data-canvas-version")).toBe("6");
	});

	it("renders the refetched public strokes after a 409 (canvas advances visibly)", async () => {
		// 挂载拉 v3（笔画 A）；提交 409(current v4) → 重拉返回 v4（笔画 A+B）
		// → 自动重提 200 published。画布底图必须随重拉更新：清增量后画布上
		// 应立即看到 B（重拉返回的公共笔画），而非停留旧底图到刷新。
		const strokeA: Stroke = {
			id: "A",
			color: "#e63946",
			width: 0.02,
			points: [
				{ x: 0.1, y: 0.1, t: 1 },
				{ x: 0.2, y: 0.1, t: 2 },
			],
		};
		const strokeB: Stroke = {
			id: "B",
			color: "#2a9d8f",
			width: 0.02,
			points: [
				{ x: 0.3, y: 0.3, t: 3 },
				{ x: 0.4, y: 0.3, t: 4 },
			],
		};
		const renderCalls: string[] = [];
		const renderCtx = {
			...mockCtx,
			moveTo: vi.fn((...args: number[]) => {
				renderCalls.push(`moveTo ${args.join(",")}`);
			}),
		};
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			renderCtx as unknown as CanvasRenderingContext2D,
		);
		let canvasGets = 0;
		let postCount = 0;
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				postCount += 1;
				if (postCount === 1) {
					return jsonResponse(409, { error: "version conflict", current_version: 4 });
				}
				return jsonResponse(200, { code: 0, data: { version: 5, status: "published" } });
			}
			if (url === "/api/games/drawing/canvas") {
				canvasGets += 1;
				if (canvasGets === 1) {
					return jsonResponse(200, { code: 0, data: { version: 3, strokes: [strokeA], updated_at: "" } });
				}
				// 409 触发的重拉：画布已推进到 v4（A+B）
				return jsonResponse(200, { code: 0, data: { version: 4, strokes: [strokeA, strokeB], updated_at: "" } });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});
		window.localStorage.setItem("token", "jwt-token");

		renderBoard();
		// 挂载底图：v3 只含 A → 渲染出现 A 起点 (80,60)、无 B 起点 (240,180)
		await waitFor(() => {
			expect(renderCalls).toContain("moveTo 80,60");
			expect(renderCalls).not.toContain("moveTo 240,180");
		});
		// 本地画一笔（未提交增量，叠在 v3 底图上）
		drawStroke();

		await clickSubmitAsAuthed();

		// 自动重提成功后底图已换 v4：B 的笔画进入渲染（240,180 起）
		expect(lastToast()?.textContent).toBe("published to the canvas");
		await waitFor(() => {
			expect(renderCalls).toContain("moveTo 240,180");
		});
		expect(board().getAttribute("data-canvas-version")).toBe("5");
	});

	it("on repeated 409s toasts the manual hint after the automatic retry is exhausted", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		let postCount = 0;
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				postCount += 1;
				return jsonResponse(409, { error: "version conflict", current_version: 7 });
			}
			if (url === "/api/games/drawing/canvas") {
				return jsonResponse(200, { code: 0, data: { version: 5, strokes: [], updated_at: "" } });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});
		await clickSubmitAsAuthed();

		// 最多 2 次提交尝试，仍冲突 → 手动提示，保留本地笔画
		expect(postCount).toBe(2);
		expect(lastToast()?.textContent).toBe("canvas moved ahead — try again");
		expect(strokeCount()).toBe(1);
	});

	it("skips the TextDetector pre-filter when the API is unavailable (jsdom default)", async () => {
		// jsdom 没有 TextDetector：不注入 → 粗筛跳过，直接提交
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(200, { code: 0, data: { version: 1, status: "published" } });
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("published to the canvas");
	});

	it("blocks the submission without any network request when TextDetector hits the word filter", async () => {
		// 注入 TextDetector：离屏渲染的笔画被 mock 判定为 "fuck"
		class FakeTextDetector {
			async detect() {
				return [{ rawValue: "fuck" }];
			}
		}
		(window as unknown as { TextDetector?: unknown }).TextDetector = FakeTextDetector;
		mockAuthedSession();
		renderBoard();
		drawStroke();
		await clickSubmitAsAuthed();

		expect(lastToast()?.textContent).toBe(
			"this doodle was blocked by the word filter",
		);
		const postCalls = vi.mocked(fetch).mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === "POST",
		);
		expect(postCalls).toHaveLength(0);
		// 拦截不误清本地笔画
		expect(strokeCount()).toBe(1);
		delete (window as unknown as { TextDetector?: unknown }).TextDetector;
	});

	it("submits normally when TextDetector is available but detects nothing", async () => {
		class FakeTextDetector {
			async detect() {
				return [];
			}
		}
		(window as unknown as { TextDetector?: unknown }).TextDetector = FakeTextDetector;
		mockAuthedSession();
		renderBoard();
		drawStroke();
		mockSubmitResponse(200, { code: 0, data: { version: 1, status: "published" } });
		await clickSubmitAsAuthed();
		expect(lastToast()?.textContent).toBe("published to the canvas");
		delete (window as unknown as { TextDetector?: unknown }).TextDetector;
	});

	it("disables the submit button with aria-busy while a submission is in flight", async () => {
		mockAuthedSession();
		renderBoard();
		drawStroke();
		// 挂起 POST：手动 resolve 前提交链不结束
		let releasePost: (value: Response) => void = () => {};
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				await new Promise<Response>((resolve) => {
					releasePost = resolve;
				});
				return jsonResponse(200, { code: 0, data: { version: 2, status: "published" } });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});

		openTools();
		await waitFor(() => {
			const toastKind = lastToast()?.getAttribute("data-toast");
			expect(toastKind === "sign-in" || toastKind === undefined).toBe(true);
		});
		fireEvent.click(submitButton());
		await waitFor(() => {
			expect(submitButton().disabled).toBe(true);
		});
		expect(submitButton().getAttribute("aria-busy")).toBe("true");
		// 提交中再点无效（按钮禁用 + handler 早退）
		fireEvent.click(submitButton());
		act(() => {
			releasePost(jsonResponse(200, { code: 0, data: { version: 2, status: "published" } }));
		});
		await waitFor(() => {
			expect(submitButton().disabled).toBe(false);
		});
		expect(lastToast()?.textContent).toBe("published to the canvas");
		// 只发出一次 POST
		const postCalls = vi.mocked(fetch).mock.calls.filter(
			([, init]) => (init as RequestInit | undefined)?.method === "POST",
		);
		expect(postCalls).toHaveLength(1);
	});

	it("aborts with the failure hint when the 409 refetch itself fails", async () => {
		let canvasGets = 0;
		vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === "/api/games/drawing/canvas" && init?.method === "POST") {
				return jsonResponse(409, { error: "version conflict", current_version: 5 });
			}
			if (url === "/api/games/drawing/canvas") {
				canvasGets += 1;
				if (canvasGets === 1) {
					// 挂载拉取成功（base 对齐 v5）；之后 409 触发的重拉失败
					//（drawingApi 对 5xx 自动重试一次，两次都 500 才向上抛）
					return jsonResponse(200, { code: 0, data: { version: 5, strokes: [], updated_at: "" } });
				}
				return jsonResponse(500, { message: "down" });
			}
			if (url === "/api/auth/me") {
				return jsonResponse(200, { code: 0, data: { username: "o", provider: "github" } });
			}
			return jsonResponse(200, { code: 0, data: { version: 0, strokes: [], updated_at: "" } });
		});
		window.localStorage.setItem("token", "jwt-token");
		renderBoard();
		drawStroke();
		await clickSubmitAsAuthed();
		// 重拉画布失败 → 通用失败文案；保留本地笔画待手动重试
		expect(lastToast()?.textContent).toBe("submission failed — try again");
		expect(strokeCount()).toBe(1);
	});
});
