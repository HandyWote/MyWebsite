import { afterEach, describe, expect, it, vi } from "vitest";
import {
	FINE_POINTER_MEDIA,
	focusWithoutStealing,
	preserveFocusAcrossMove,
	shouldAutoFocus,
} from "./focus";

/** 手动帧调度器：测试自己决定何时“下一帧”，不依赖 jsdom 的计时。 */
function manualScheduler() {
	const queue: Array<() => void> = [];
	const schedule = (callback: () => void) => {
		queue.push(callback);
		return () => {
			const index = queue.indexOf(callback);
			if (index !== -1) queue.splice(index, 1);
		};
	};
	const flush = () => {
		for (const callback of queue.splice(0)) callback();
	};
	return { schedule, flush };
}

/** 一个典型的“搬家”：把 source 这棵子树挪到 target 下。 */
function setupMove() {
	const source = document.createElement("div");
	const target = document.createElement("div");
	document.body.append(source, target);
	const input = document.createElement("input");
	source.appendChild(input);
	return { source, target, input };
}

function focusInput(): HTMLInputElement {
	const input = document.createElement("input");
	document.body.appendChild(input);
	input.focus();
	return input;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

describe("FINE_POINTER_MEDIA", () => {
	it("is the fine-pointer capability query, not the 3D gate", () => {
		expect(FINE_POINTER_MEDIA).toBe("(hover: hover) and (pointer: fine)");
	});
});

describe("shouldAutoFocus", () => {
	it("returns false without a window (SSR)", () => {
		vi.stubGlobal("window", undefined);
		expect(shouldAutoFocus()).toBe(false);
	});

	it("returns false when the environment has no matchMedia", () => {
		vi.stubGlobal("window", {});
		expect(shouldAutoFocus()).toBe(false);
	});

	it("follows the fine-pointer media query result", () => {
		const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({
			matches: true,
		} as MediaQueryList);
		expect(shouldAutoFocus()).toBe(true);
		expect(matchMedia).toHaveBeenCalledWith(FINE_POINTER_MEDIA);

		matchMedia.mockReturnValue({ matches: false } as MediaQueryList);
		expect(shouldAutoFocus()).toBe(false);
	});
});

describe("focusWithoutStealing", () => {
	it("focuses the element with preventScroll when nothing else is focused", () => {
		const input = document.createElement("input");
		document.body.appendChild(input);
		const focus = vi.spyOn(input, "focus");

		expect(focusWithoutStealing(input)).toBe(true);
		expect(document.activeElement).toBe(input);
		expect(focus).toHaveBeenCalledWith({ preventScroll: true });
	});

	it("never steals focus from an already focused element", () => {
		const held = focusInput();
		const other = document.createElement("input");
		document.body.appendChild(other);

		expect(focusWithoutStealing(other)).toBe(false);
		expect(document.activeElement).toBe(held);
	});

	it("is a no-op for a missing element", () => {
		expect(() => focusWithoutStealing(null)).not.toThrow();
		expect(focusWithoutStealing(undefined)).toBe(false);
	});
});

describe("preserveFocusAcrossMove", () => {
	it("restores focus that the move blurred, one frame later", () => {
		const { source, target, input } = setupMove();
		input.focus();
		const { schedule, flush } = manualScheduler();

		preserveFocusAcrossMove(() => target.appendChild(source), document, schedule);

		// 搬家本身 blur 了输入框，但恢复被推迟到下一帧。
		expect(document.activeElement).toBe(document.body);
		flush();
		expect(document.activeElement).toBe(input);
	});

	it("leaves an outside focused element alone (the comment box case)", () => {
		const { source, target } = setupMove();
		const held = focusInput();
		const { schedule, flush } = manualScheduler();

		preserveFocusAcrossMove(() => target.appendChild(source), document, schedule);
		flush();

		expect(document.activeElement).toBe(held);
	});

	it("does not resurrect focus when the focused element left the document", () => {
		const { source, target } = setupMove();
		const input = source.querySelector("input")!;
		input.focus();
		const { schedule, flush } = manualScheduler();

		preserveFocusAcrossMove(() => {
			target.appendChild(source);
			source.remove();
		}, document, schedule);
		flush();

		expect(input.isConnected).toBe(false);
		expect(document.activeElement).toBe(document.body);
	});

	it("does not fight the user who moved focus after the move", () => {
		const { source, target, input } = setupMove();
		input.focus();
		const { schedule, flush } = manualScheduler();
		const later = document.createElement("input");
		document.body.appendChild(later);

		preserveFocusAcrossMove(() => target.appendChild(source), document, schedule);
		later.focus();
		flush();

		expect(document.activeElement).toBe(later);
	});

	it("does nothing when the document had no focus before the move", () => {
		const { source, target } = setupMove();
		const { schedule, flush } = manualScheduler();

		const cancel = preserveFocusAcrossMove(
			() => target.appendChild(source),
			document,
			schedule,
		);
		flush();
		cancel();

		expect(document.activeElement).toBe(document.body);
	});

	it("cancels a pending restore", () => {
		const { source, target, input } = setupMove();
		input.focus();
		const { schedule, flush } = manualScheduler();

		const cancel = preserveFocusAcrossMove(
			() => target.appendChild(source),
			document,
			schedule,
		);
		cancel();
		flush();

		expect(document.activeElement).toBe(document.body);
	});
});
