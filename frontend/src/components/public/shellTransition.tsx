"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SHELL_NAV_ITEMS } from "./shellUtils";

/**
 * 终端转场:站内跳转统一为「旧内容上移消失 → 换页 → 新内容从命令行上沿升起」。
 * explorer、状态栏、命令行全程不动;只有 data-shell-content 在动。
 *
 * 实现要点(经 /preview 逐帧验证后固化):
 * - 不改 DOM 结构、不搬节点(WAAPI 直接对内容容器做动画,React 节点保持原位,
 *   避免与协调器冲突,也避免 3D 模式下 CSS3D 宿主的 DOM 搬迁)。
 * - 位移时同步 clip-path,把可见窗口限定在「状态栏下沿 ~ main 底边(命令行上沿)」:
 *   内容往上滑不会盖状态栏,从下面来时从命令行上沿冒出。
 * - 只用布局坐标(offsetTop / offsetHeight / clientHeight),3D 模式的 CSS3D
 *   变换不影响计算。
 * - prefers-reduced-motion 直接跳转,不出动画。
 * - 修饰键点击(新标签/窗口)、外链、同页锚点一律不拦截。
 */

const TYPE_MS = 42;
const OUT_MS = 260;
const IN_MS = 380;
const EASE_IN = "cubic-bezier(.16,1,.3,1)";
const EASE_OUT = "cubic-bezier(.5,0,.9,.5)";

const reduced = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Frame = { main: HTMLElement; content: HTMLElement; top: number; bottom: number };

function frame(): Frame | null {
	const main = document.querySelector<HTMLElement>("[data-shell-main]");
	const status = main?.querySelector<HTMLElement>("[data-shell-status]");
	const content = main?.querySelector<HTMLElement>("[data-shell-content]");
	if (!main || !status || !content) return null;
	return {
		main,
		content,
		top: status.offsetHeight,
		bottom: main.clientHeight,
	};
}

/** 位移 ty 时的裁切:元素平移出「状态栏下沿 ~ 命令行上沿」窗口的部分不可见。 */
function slide(f: Frame, from: number, to: number) {
	const contentTop = f.content.offsetTop - f.main.scrollTop;
	const height = f.content.offsetHeight;
	const clip = (ty: number) => {
		const y0 = contentTop + ty;
		const insetTop = Math.max(0, f.top - y0);
		const insetBottom = Math.max(0, y0 + height - f.bottom);
		return `inset(${insetTop}px 0 ${insetBottom}px 0)`;
	};
	return [
		{ transform: `translateY(${from}px)`, clipPath: clip(from) },
		{ transform: `translateY(${to}px)`, clipPath: clip(to) },
	];
}

/** 动画期间锁住 main 滚动,并临时 relative 让 offsetTop 以 main 为参照。 */
function lockScroll(main: HTMLElement) {
	const prevOverflow = main.style.overflow;
	const prevPosition = main.style.position;
	main.style.overflow = "hidden";
	if (getComputedStyle(main).position === "static") main.style.position = "relative";
	return () => {
		main.style.overflow = prevOverflow;
		main.style.position = prevPosition;
	};
}

/** 命令行逐字打出命令:写入真实 TerminalCommandBar 的输入(React 受控可感知)。 */
async function typeCommand(text: string) {
	const input = document.querySelector<HTMLInputElement>(
		".screen-page input[aria-label='Terminal command']",
	);
	if (!input) return;
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	for (let i = 1; i <= text.length; i += 1) {
		setter?.call(input, text.slice(0, i));
		input.dispatchEvent(new Event("input", { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, TYPE_MS));
	}
}

const commandFor = (pathname: string): string =>
	SHELL_NAV_ITEMS.find((item) => item.href === pathname)?.command ??
	`cd ${pathname.replace(/^\//, "") || "~"}/`;

export function flipNavigate(
	router: { push: (href: string) => void },
	href: string,
): void {
	const go = () => router.push(href);
	if (reduced()) {
		go();
		return;
	}
	void (async () => {
		const f = frame();
		if (!f) {
			go();
			return;
		}
		const unlock = lockScroll(f.main);
		f.content.animate(slide(f, 0, -(f.bottom - f.top)), {
			duration: OUT_MS,
			easing: EASE_OUT,
			fill: "forwards",
		});
		await new Promise((resolve) => setTimeout(resolve, OUT_MS));
		unlock();
		go();
	})();
}

/** 点击站内链接 → 命令行自动打字执行命令,再走 flipNavigate。 */
export function useShellFlip(): void {
	const router = useRouter();

	useEffect(() => {
		let oldContent: Element | null = null;
		let awaitingNew = false;

		// 新内容挂载的那一帧就开始升起(MutationObserver 回调是微任务,早于绘制)。
		const observer = new MutationObserver(() => {
			if (!awaitingNew) return;
			const f = frame();
			if (!f || f.content === oldContent) return;
			awaitingNew = false;
			const unlock = lockScroll(f.main);
			const start =
				f.bottom - (f.content.offsetTop - f.main.scrollTop);
			const anim = f.content.animate(slide(f, start, 0), {
				duration: IN_MS,
				easing: EASE_IN,
			});
			anim.finished.finally(unlock).catch(() => {});
		});
		observer.observe(document.body, { childList: true, subtree: true });

		const onClick = (event: MouseEvent) => {
			if (event.defaultPrevented || event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			const anchor = (event.target as Element | null)?.closest?.(
				"a[href]",
			) as HTMLAnchorElement | null;
			if (!anchor) return;
			if (anchor.target && anchor.target !== "_self") return;
			const url = new URL(anchor.href, window.location.href);
			if (url.origin !== window.location.origin) return;
			if (url.pathname === window.location.pathname) return;

			event.preventDefault();
			const target = `${url.pathname}${url.search}`;

			if (reduced()) {
				void typeCommand(commandFor(url.pathname)).then(() =>
					router.push(target),
				);
				return;
			}

			void (async () => {
				await typeCommand(commandFor(url.pathname));
				const f = frame();
				if (!f) {
					router.push(target);
					return;
				}
				oldContent = f.content;
				const unlock = lockScroll(f.main);
				const contentTop = f.content.offsetTop - f.main.scrollTop;
				const visibleBottom = Math.min(
					contentTop + f.content.offsetHeight,
					f.bottom,
				);
				const end = -(visibleBottom - f.top);
				f.content.animate(slide(f, 0, end), {
					duration: OUT_MS,
					easing: EASE_OUT,
					fill: "forwards",
				});
				await new Promise((resolve) => setTimeout(resolve, OUT_MS));
				unlock();
				awaitingNew = true;
				router.push(target);
			})();
		};

		document.addEventListener("click", onClick, true);
		return () => {
			document.removeEventListener("click", onClick, true);
			observer.disconnect();
		};
	}, [router]);
}
