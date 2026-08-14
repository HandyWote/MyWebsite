"use client";

import type { GameViewProps } from "../types";

/**
 * P0 占位实现：由 G4 整体重写为完整画板（画布/笔刷/撤销/草稿）。
 * 保持 `data-game="drawing"` 根属性不变，供路由挂载与 e2e 探针定位。
 */
export function DrawingGame(_props: GameViewProps) {
	return (
		<div data-game="drawing" data-stroke-count="0">
			<span>Drawing board (P0 placeholder)</span>
		</div>
	);
}
