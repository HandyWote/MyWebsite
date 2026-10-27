/**
 * 聚焦基元（纯 DOM，不依赖 React）。
 *
 * 两个动机：
 * 1. 自动聚焦只该在“用户明确在用桌面”时发生：触屏设备弹软键盘会打断阅读。
 * 2. 3D 场景 / 纸质聚焦层会把同一个 host 在 DOM 里搬家（appendChild 到
 *    另一个父节点）。浏览器（以及 jsdom）在宿主被移出文档时会把焦点丢给
 *    body，于是用户正在输入的终端/评论框会失焦。搬家前后包裹
 *    `preserveFocusAcrossMove` 即可把焦点还给“只被这次搬家 blur 掉”的那个
 *    元素——不硬编码任何具体控件，所以评论框、终端、将来任何输入都同样受益。
 */

/**
 * 桌面精细指针（hover + fine pointer）。自动聚焦只认这个能力门槛：
 * 它与 3D 能力门槛 `DESKTOP_3D_MEDIA`（还带 min-width:1024px）不是同一个
 * 概念，故意不复用——小窗口的桌面浏览器依旧该能自动聚焦。
 */
export const FINE_POINTER_MEDIA = "(hover: hover) and (pointer: fine)";

/** 把回调排到下一帧，返回取消函数。可注入，便于测试不依赖真实帧。 */
export type FrameScheduler = (callback: () => void) => () => void;

const scheduleFrame: FrameScheduler = (callback) => {
	if (typeof requestAnimationFrame === "function") {
		const id = requestAnimationFrame(callback);
		return () => {
			if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
		};
	}
	// 无 rAF 的环境（老 jsdom / 非浏览器宿主）：退化为宏任务，语义仍是“本轮之后”。
	const id = setTimeout(callback, 0);
	return () => clearTimeout(id);
};

/** 文档当前是否“没有焦点”：null / body / documentElement 都算没有。 */
function isIdleFocus(doc: Document): boolean {
	const active = doc.activeElement;
	return active === null || active === doc.body || active === doc.documentElement;
}

/** 当前真正持有焦点的元素；没有则 null。 */
function focusedElement(doc: Document): HTMLElement | null {
	if (isIdleFocus(doc)) return null;
	const active = doc.activeElement;
	return active instanceof HTMLElement ? active : null;
}

/**
 * 是否允许自动聚焦：SSR（无 window）与无 matchMedia 的环境一律 false，
 * 只有匹配 {@link FINE_POINTER_MEDIA} 才算桌面。
 */
export function shouldAutoFocus(): boolean {
	if (typeof window === "undefined") return false;
	if (typeof window.matchMedia !== "function") return false;
	try {
		return window.matchMedia(FINE_POINTER_MEDIA).matches === true;
	} catch {
		// 某些宿主（隐私模式 / 已卸载的 webview）会抛，静默降级为不聚焦。
		return false;
	}
}

/**
 * 聚焦 `el`，但绝不抢走用户已有的焦点：若文档里已经有别的元素处于聚焦
 * （activeElement 不是 null/body/documentElement），直接 no-op。
 * `preventScroll` 避免聚焦把页面滚到控件所在位置（3D 场景里尤其刺眼）。
 * 返回实际是否聚焦成功。
 */
export function focusWithoutStealing(
	el: HTMLElement | null | undefined,
	doc: Document = document,
): boolean {
	if (!el) return false;
	if (!isIdleFocus(doc)) return false;
	el.focus({ preventScroll: true });
	return doc.activeElement === el;
}

/**
 * 执行一次“DOM 搬家”（reparent / detach + append），并把焦点还给搬家前
 * 持有它的那个元素。
 *
 * 语义边界（刻意收窄，避免成为抢焦点的后门）：
 * - 搬家前没有焦点（body/null）→ 什么也不做；
 * - 搬家后用户已经把焦点挪到别处 → 不插手；
 * - 原元素已经不在文档里（isConnected false）→ 不恢复；
 * - 只在下一帧检查并恢复：搬家是同步的一串 DOM 操作，浏览器会在中间
 *   某次移除时同步 blur，等到调用方完成布局/重排后再还焦点才安全。
 *
 * `move` 必须是“会 blur 掉 `doc.activeElement` 的那次搬家”；调用方保证
 * 恢复对象位于被搬子树内。返回取消函数（销毁/卸载时调用）。
 */
export function preserveFocusAcrossMove(
	move: () => void,
	doc: Document = document,
	schedule: FrameScheduler = scheduleFrame,
): () => void {
	const previous = focusedElement(doc);
	move();
	if (!previous || !previous.isConnected) return () => {};
	return schedule(() => {
		if (!previous.isConnected || !isIdleFocus(doc)) return;
		focusWithoutStealing(previous, doc);
	});
}
