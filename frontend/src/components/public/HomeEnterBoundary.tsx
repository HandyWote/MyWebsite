"use client";

import {
	useRef,
	type PointerEvent,
	type MouseEvent,
	type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";

export function HomeEnterBoundary({ children }: { children: ReactNode }) {
	const router = useRouter();
	const lastTapAt = useRef(0);
	const isInteractive = (target: EventTarget | null) =>
		target instanceof Element &&
		Boolean(target.closest("a, button, input, textarea, select"));
	const enter = (target: EventTarget | null) => {
		if (!isInteractive(target)) router.push("/articles");
	};
	const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
		if (event.pointerType !== "touch" || isInteractive(event.target)) return;
		const now = Date.now();
		if (now - lastTapAt.current < 320) {
			lastTapAt.current = 0;
			router.push("/articles");
		} else {
			lastTapAt.current = now;
		}
	};
	// height: 100% 保证 3D 模式下页面根节点（height: var(--public-viewport-height)）
	// 能透过本层解析到 #screen-host 的确定高度，否则页面会塌缩成内容高度
	return (
		<Box
			sx={{ height: "100%" }}
			onDoubleClick={(event: MouseEvent<HTMLDivElement>) => enter(event.target)}
			onPointerUp={onPointerUp}
		>
			{children}
		</Box>
	);
}
