import type { ComponentType } from "react";
import type { PaperGameHost } from "./host";

/**
 * 笔画模型（P0 冻结，P1 上传契约直接复用）。
 * 坐标为 0-1 相对值，与纸面实际尺寸解耦。
 */
export interface Stroke {
	id: string;
	color: string;
	/** 相对笔宽（0-1）。 */
	width: number;
	/** 坐标 0-1 相对值，t: 时间戳(ms)。 */
	points: Array<{ x: number; y: number; t: number }>;
}

export type Drawing = { strokes: Stroke[] };

export interface GameViewProps {
	host: PaperGameHost;
}

/** 游戏定义：注册表唯一事实源，为多游戏与 M3D 纸堆预留。 */
export interface GameDefinition {
	/** 稳定 id，用于路由 /games/[id]、草稿命名空间、M3D 纸堆。 */
	id: string;
	/** 大厅/纸堆展示名。 */
	name: string;
	description: string;
	/** 静态效果图 URL（M3D 纸堆落定时浮现；设计游戏时配好）。 */
	preview: string;
	/** 挂到纸面的游戏组件（桌面端渲染）。 */
	GameView: ComponentType<GameViewProps>;
	/** 查看模式组件（非桌面端 /games/[id] 渲染，可选）。 */
	DetailView?: ComponentType<GameViewProps>;
	/** 默认 true：只挂 3D 纸面。 */
	desktopOnly?: boolean;
	/** 是否默认游戏：首页纸面未指定 id 时挂载它。 */
	isDefault?: boolean;
}
