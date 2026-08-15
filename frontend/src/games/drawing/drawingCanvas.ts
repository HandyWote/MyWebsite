import type { Drawing, Stroke } from "../types";

/**
 * 画板渲染纯逻辑（P0 计划 Task 5）。
 * 不依赖 DOM/React：笔画以 0-1 相对坐标存储，与纸面实际尺寸解耦，
 * P1 上传契约直接复用同构数据。
 */

/** 色板（8 色）：米白纸面上均清晰可见。 */
export const PALETTE = [
	"#264653",
	"#e63946",
	"#2a9d8f",
	"#e9c46a",
	"#457b9d",
	"#e76f51",
	"#6d6875",
	"#1d3557",
] as const;

/** 笔宽档位（相对纸面 min(width, height) 的比例，0-1）。 */
export const BRUSH_WIDTHS = [0.02, 0.055, 0.12] as const;

/** 橡皮哨兵色：笔画 color 等于它时以 destination-out 覆盖模式渲染。 */
export const ERASER_COLOR = "__eraser__";

/** 默认笔宽：中间档。 */
export const DEFAULT_WIDTH = BRUSH_WIDTHS[1];

let strokeSeq = 0;

/** 笔画 id：优先 crypto.randomUUID（jsdom/旧环境降级为时间戳+序号）。 */
function createStrokeId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	strokeSeq += 1;
	return `stroke-${Date.now().toString(36)}-${strokeSeq}`;
}

/**
 * 新建笔画。points 可选：缺省为空数组，绘制过程中逐步追加。
 * width 缺省取默认笔宽档。
 */
export function createStroke(
	color: string,
	width: number = DEFAULT_WIDTH,
	points: Stroke["points"] = [],
): Stroke {
	return { id: createStrokeId(), color, width, points };
}

function clamp01(value: number): number {
	return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * 把屏幕 clientX/clientY 归一化为纸面 0-1 相对坐标（clamp 到 [0,1]）。
 * rect 取 canvas.getBoundingClientRect()：CSS3D transform 缩放纸面后
 * client 坐标与 rect 同处屏幕空间，比值仍然正确。
 */
export function pointToLocal(
	clientX: number,
	clientY: number,
	rect: DOMRect,
): { x: number; y: number } {
	const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
	const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
	return { x: clamp01(x), y: clamp01(y) };
}

/**
 * 全量重绘画布：
 * 1. 以设备像素 clearRect（先复位 transform 为恒等）；
 * 2. setTransform(dpr,0,0,dpr,0,0)，之后按 CSS 像素坐标绘制；
 * 3. 每笔把相对坐标映射为 x*width / y*height；lineCap/lineJoin round；
 *    单点笔画画实心圆点；笔宽 = stroke.width × min(width, height)；
 *    橡皮（ERASER_COLOR）用 destination-out，普通笔 source-over。
 */
export function renderDrawing(
	ctx: CanvasRenderingContext2D,
	drawing: Drawing,
	size: { width: number; height: number },
	dpr: number,
): void {
	const { width, height } = size;
	const deviceWidth = Math.max(1, Math.ceil(width * dpr));
	const deviceHeight = Math.max(1, Math.ceil(height * dpr));

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, deviceWidth, deviceHeight);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	const base = Math.min(width, height);
	for (const stroke of drawing.strokes) {
		if (stroke.points.length === 0) continue;

		const eraser = stroke.color === ERASER_COLOR;
		const lineWidth = Math.max(0.5, stroke.width * base);
		const ink = eraser ? "#000" : stroke.color;

		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = lineWidth;
		ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
		ctx.strokeStyle = ink;

		if (stroke.points.length === 1) {
			const point = stroke.points[0];
			ctx.beginPath();
			ctx.arc(
				point.x * width,
				point.y * height,
				lineWidth / 2,
				0,
				Math.PI * 2,
			);
			ctx.fillStyle = ink;
			ctx.fill();
			continue;
		}

		ctx.beginPath();
		ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
		for (let i = 1; i < stroke.points.length; i += 1) {
			ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
		}
		ctx.stroke();
	}

	ctx.globalCompositeOperation = "source-over";
}
