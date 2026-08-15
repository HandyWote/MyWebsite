import { describe, expect, it, vi } from "vitest";
import type { Drawing } from "../types";
import {
	BRUSH_WIDTHS,
	ERASER_COLOR,
	PALETTE,
	createStroke,
	pointToLocal,
	renderDrawing,
} from "./drawingCanvas";

/** 可断言的 CanvasRenderingContext2D mock：记录调用序列与属性赋值。 */
function createMockContext() {
	const calls: string[] = [];
	const composites: string[] = [];
	let composite = "source-over";
	const ctx = {
		get globalCompositeOperation() {
			return composite;
		},
		set globalCompositeOperation(value: string) {
			composite = value;
			composites.push(value);
		},
		lineCap: "butt",
		lineJoin: "miter",
		lineWidth: 1,
		strokeStyle: "#000",
		fillStyle: "#000",
		setTransform: vi.fn((...args: number[]) => {
			calls.push(`setTransform ${args.join(",")}`);
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
	return { ctx, calls, composites };
}

describe("palette and brush constants", () => {
	it("exposes 6-8 palette colors as hex strings", () => {
		expect(PALETTE.length).toBeGreaterThanOrEqual(6);
		expect(PALETTE.length).toBeLessThanOrEqual(8);
		for (const color of PALETTE) {
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it("exposes 2-3 relative brush widths within (0, 1]", () => {
		expect(BRUSH_WIDTHS.length).toBeGreaterThanOrEqual(2);
		expect(BRUSH_WIDTHS.length).toBeLessThanOrEqual(3);
		for (const width of BRUSH_WIDTHS) {
			expect(width).toBeGreaterThan(0);
			expect(width).toBeLessThanOrEqual(1);
		}
	});

	it("keeps the eraser sentinel distinct from palette colors", () => {
		expect(PALETTE).not.toContain(ERASER_COLOR);
	});
});

describe("createStroke", () => {
	it("builds a stroke with id, color, width and empty points", () => {
		const stroke = createStroke("#264653", 0.5);
		expect(stroke.id.length).toBeGreaterThan(0);
		expect(stroke.color).toBe("#264653");
		expect(stroke.width).toBe(0.5);
		expect(stroke.points).toEqual([]);
	});

	it("generates a fresh id for every stroke", () => {
		expect(createStroke("#000").id).not.toBe(createStroke("#000").id);
	});

	it("defaults the width and accepts initial points", () => {
		const stroke = createStroke("#000", undefined, [
			{ x: 0.1, y: 0.2, t: 1 },
		]);
		expect(stroke.width).toBe(BRUSH_WIDTHS[1]);
		expect(stroke.points).toEqual([{ x: 0.1, y: 0.2, t: 1 }]);
	});
});

describe("pointToLocal", () => {
	const rect = { left: 10, top: 20, width: 200, height: 100 } as DOMRect;

	it("normalizes client coordinates into 0-1 relative values", () => {
		expect(pointToLocal(110, 70, rect)).toEqual({ x: 0.5, y: 0.5 });
	});

	it("clamps out-of-bounds coordinates to [0, 1]", () => {
		expect(pointToLocal(0, 0, rect)).toEqual({ x: 0, y: 0 });
		expect(pointToLocal(999, 999, rect)).toEqual({ x: 1, y: 1 });
	});

	it("returns zeros for a zero-size rect", () => {
		const empty = { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
		expect(pointToLocal(50, 50, empty)).toEqual({ x: 0, y: 0 });
	});
});

describe("renderDrawing", () => {
	it("clears the full device canvas and applies the dpr transform", () => {
		const { ctx, calls } = createMockContext();
		renderDrawing(ctx, { strokes: [] }, { width: 200, height: 100 }, 2);
		expect(calls).toEqual([
			"setTransform 1,0,0,1,0,0",
			"clearRect 0,0,400,200",
			"setTransform 2,0,0,2,0,0",
		]);
	});

	it("maps relative points onto the css size and scales the line width", () => {
		const { ctx, calls } = createMockContext();
		const drawing: Drawing = {
			strokes: [
				{
					id: "s1",
					color: "#264653",
					width: 0.05,
					points: [
						{ x: 0, y: 0, t: 0 },
						{ x: 0.5, y: 0.5, t: 1 },
						{ x: 1, y: 1, t: 2 },
					],
				},
			],
		};
		renderDrawing(ctx, drawing, { width: 200, height: 100 }, 1);

		// min(200, 100) = 100 → 笔宽 0.05 × 100 = 5
		expect(ctx.lineCap).toBe("round");
		expect(ctx.lineJoin).toBe("round");
		expect(ctx.lineWidth).toBe(5);
		expect(calls).toContain("moveTo 0,0");
		expect(calls).toContain("lineTo 100,50");
		expect(calls).toContain("lineTo 200,100");
		expect(calls).toContain("stroke");
	});

	it("renders a single-point stroke as a filled circle", () => {
		const { ctx, calls } = createMockContext();
		const drawing: Drawing = {
			strokes: [
				{
					id: "s1",
					color: "#e63946",
					width: 0.1,
					points: [{ x: 0.25, y: 0.5, t: 0 }],
				},
			],
		};
		renderDrawing(ctx, drawing, { width: 200, height: 100 }, 1);
		// 圆心 (0.25×200, 0.5×100) = (50, 50)，半径 = 10 / 2
		expect(calls).toContain("arc 50,50,5,0,6.283185307179586");
		expect(calls).toContain("fill");
	});

	it("renders eraser strokes in destination-out and restores source-over", () => {
		const { ctx, composites } = createMockContext();
		const drawing: Drawing = {
			strokes: [
				{
					id: "ink",
					color: "#264653",
					width: 0.02,
					points: [
						{ x: 0, y: 0, t: 0 },
						{ x: 1, y: 1, t: 1 },
					],
				},
				{
					id: "rubber",
					color: ERASER_COLOR,
					width: 0.02,
					points: [
						{ x: 0.1, y: 0.1, t: 0 },
						{ x: 0.9, y: 0.9, t: 1 },
					],
				},
			],
		};
		renderDrawing(ctx, drawing, { width: 200, height: 100 }, 1);
		// 普通笔 source-over → 橡皮 destination-out → 结束时复位 source-over
		expect(composites).toEqual([
			"source-over",
			"destination-out",
			"source-over",
		]);
	});

	it("skips strokes without points", () => {
		const { ctx, calls } = createMockContext();
		const drawing: Drawing = {
			strokes: [
				{ id: "empty", color: "#000", width: 0.05, points: [] },
			],
		};
		renderDrawing(ctx, drawing, { width: 100, height: 100 }, 1);
		expect(
			calls.filter(
				(call) =>
					call.startsWith("moveTo") ||
					call.startsWith("lineTo") ||
					call === "stroke" ||
					call === "fill" ||
					call.startsWith("arc"),
			),
		).toEqual([]);
	});
});
