import type { Drawing, Stroke } from "../types";

/**
 * localStorage 草稿（P0 计划 Task 5）。
 * 命名空间 `game:drawing:draft`；防抖自动保存，卸载时 flush，隐私模式静默降级。
 * 数据与 P1 上传契约同构（Drawing 即 { strokes: Stroke[] }）。
 */

/** 草稿 localStorage key（P0 冻结命名空间）。 */
export const DRAFT_KEY = "game:drawing:draft";

const SAVE_DEBOUNCE_MS = 500;

function isPoint(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false;
	const point = value as Record<string, unknown>;
	return (
		typeof point.x === "number" &&
		Number.isFinite(point.x) &&
		typeof point.y === "number" &&
		Number.isFinite(point.y) &&
		typeof point.t === "number" &&
		Number.isFinite(point.t)
	);
}

function isStroke(value: unknown): value is Stroke {
	if (typeof value !== "object" || value === null) return false;
	const stroke = value as Record<string, unknown>;
	return (
		typeof stroke.id === "string" &&
		stroke.id.length > 0 &&
		typeof stroke.color === "string" &&
		stroke.color.length > 0 &&
		typeof stroke.width === "number" &&
		Number.isFinite(stroke.width) &&
		Array.isArray(stroke.points) &&
		stroke.points.every(isPoint)
	);
}

/**
 * 形状校验：strokes 数组，每笔 id/color/width 类型正确、
 * points 为 {x,y,t} 数值数组。非法值返回 false。
 */
export function isDrawing(value: unknown): value is Drawing {
	if (typeof value !== "object" || value === null) return false;
	const strokes = (value as { strokes?: unknown }).strokes;
	return Array.isArray(strokes) && strokes.every(isStroke);
}

/**
 * 读取草稿：JSON 解析 + isDrawing 校验；无草稿/损坏/隐私模式
 * （localStorage 访问抛异常）一律返回 null，静默降级。
 */
export function loadDraft(): Drawing | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		return isDrawing(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDraft: Drawing | null = null;

function writeDraft(): void {
	const drawing = pendingDraft;
	pendingDraft = null;
	if (drawing === null || typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(drawing));
	} catch {
		// 隐私模式/配额满：静默降级，不打断绘制
	}
}

/**
 * 防抖保存：约 500ms 窗口内多次调用只写一次，写入窗口内的最后一次
 * 状态（保证在首次变更后最多延迟 500ms 落盘）。
 */
export function scheduleSave(drawing: Drawing): void {
	pendingDraft = drawing;
	if (saveTimer !== null) return;
	saveTimer = setTimeout(() => {
		saveTimer = null;
		writeDraft();
	}, SAVE_DEBOUNCE_MS);
}

/** 立即写入未决草稿（组件卸载/路由切换时调用）。 */
export function flushDraft(): void {
	if (saveTimer !== null) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	writeDraft();
}

/** 删除草稿并取消未决写（“新画”时调用）。 */
export function clearDraft(): void {
	if (saveTimer !== null) {
		clearTimeout(saveTimer);
		saveTimer = null;
	}
	pendingDraft = null;
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(DRAFT_KEY);
	} catch {
		// 静默降级
	}
}
