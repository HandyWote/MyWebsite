import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing } from "../types";
import {
	DRAFT_KEY,
	clearDraft,
	flushDraft,
	isDrawing,
	loadDraft,
	scheduleSave,
} from "./draftStore";

const sampleDrawing: Drawing = {
	strokes: [
		{
			id: "s1",
			color: "#264653",
			width: 0.02,
			points: [
				{ x: 0.1, y: 0.2, t: 1 },
				{ x: 0.3, y: 0.4, t: 2 },
			],
		},
	],
};

const otherDrawing: Drawing = {
	strokes: [
		{
			id: "s2",
			color: "__eraser__",
			width: 0.12,
			points: [{ x: 0.5, y: 0.5, t: 3 }],
		},
	],
};

beforeEach(() => {
	vi.useRealTimers();
	clearDraft();
	// 重置 setupTests 功能性 localStorage mock 的调用历史（跨用例累计）
	vi.clearAllMocks();
	window.localStorage.clear();
});

afterEach(() => {
	vi.useRealTimers();
	clearDraft();
	vi.restoreAllMocks();
	window.localStorage.clear();
});

describe("isDrawing", () => {
	it("accepts a valid drawing", () => {
		expect(isDrawing(sampleDrawing)).toBe(true);
	});

	it("accepts an empty strokes array", () => {
		expect(isDrawing({ strokes: [] })).toBe(true);
	});

	it("rejects non-object values and missing strokes arrays", () => {
		expect(isDrawing(null)).toBe(false);
		expect(isDrawing(undefined)).toBe(false);
		expect(isDrawing(42)).toBe(false);
		expect(isDrawing("drawing")).toBe(false);
		expect(isDrawing({})).toBe(false);
		expect(isDrawing({ strokes: "nope" })).toBe(false);
		expect(isDrawing({ strokes: [null] })).toBe(false);
	});

	it("rejects strokes with wrong field types", () => {
		const base = sampleDrawing.strokes[0];
		expect(isDrawing({ strokes: [{ ...base, id: 1 }] })).toBe(false);
		expect(isDrawing({ strokes: [{ ...base, id: "" }] })).toBe(false);
		expect(isDrawing({ strokes: [{ ...base, color: "" }] })).toBe(false);
		expect(
			isDrawing({ strokes: [{ ...base, width: Number.NaN }] }),
		).toBe(false);
		expect(isDrawing({ strokes: [{ ...base, points: "x" }] })).toBe(false);
		expect(
			isDrawing({ strokes: [{ ...base, points: [{ x: 0, y: 0 }] }] }),
		).toBe(false);
		expect(
			isDrawing({
				strokes: [{ ...base, points: [{ x: Number.NaN, y: 0, t: 1 }] }],
			}),
		).toBe(false);
		expect(
			isDrawing({ strokes: [{ ...base, points: [{ x: 0, y: 0, t: "1" }] }] }),
		).toBe(false);
	});
});

describe("loadDraft", () => {
	it("returns null when no draft exists", () => {
		expect(loadDraft()).toBeNull();
	});

	it("round-trips a stored draft", () => {
		window.localStorage.setItem(DRAFT_KEY, JSON.stringify(sampleDrawing));
		expect(loadDraft()).toEqual(sampleDrawing);
	});

	it("returns null for corrupt JSON", () => {
		window.localStorage.setItem(DRAFT_KEY, "{oops");
		expect(loadDraft()).toBeNull();
	});

	it("returns null for a well-formed but invalid shape", () => {
		window.localStorage.setItem(
			DRAFT_KEY,
			JSON.stringify({ strokes: [{ id: 1 }] }),
		);
		expect(loadDraft()).toBeNull();
	});

	it("degrades silently when localStorage access throws (privacy mode)", () => {
		const originalGetItem = window.localStorage.getItem;
		window.localStorage.getItem = () => {
			throw new Error("denied");
		};
		try {
			expect(loadDraft()).toBeNull();
		} finally {
			window.localStorage.getItem = originalGetItem;
		}
	});
});

describe("scheduleSave / flushDraft / clearDraft", () => {
	it("debounces writes and saves the latest drawing in the window", () => {
		vi.useFakeTimers();
		scheduleSave(sampleDrawing);
		vi.advanceTimersByTime(499);
		scheduleSave(otherDrawing);
		vi.advanceTimersByTime(1);

		expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
		expect(loadDraft()).toEqual(otherDrawing);
	});

	it("does not write before the debounce window elapses", () => {
		vi.useFakeTimers();
		scheduleSave(sampleDrawing);
		vi.advanceTimersByTime(499);
		expect(window.localStorage.setItem).not.toHaveBeenCalled();
	});

	it("writes the pending draft immediately on flush", () => {
		vi.useFakeTimers();
		scheduleSave(sampleDrawing);
		flushDraft();

		expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
		expect(loadDraft()).toEqual(sampleDrawing);

		// 无未决写时 flush 是幂等的
		flushDraft();
		expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);
	});

	it("clears the draft and cancels the pending write", () => {
		vi.useFakeTimers();
		scheduleSave(sampleDrawing);
		clearDraft();
		vi.advanceTimersByTime(1000);

		expect(window.localStorage.setItem).not.toHaveBeenCalled();
		expect(window.localStorage.removeItem).toHaveBeenCalledWith(DRAFT_KEY);
		expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
	});
});
