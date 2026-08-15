import { DrawingGame } from "./drawing/DrawingGame";
import type { GameDefinition } from "./types";

/** 预览图：内联 SVG data URI，避免 P0 引入静态资源依赖。 */
const DRAWING_PREVIEW =
	"data:image/svg+xml;utf8," +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#f4ecd8"/><path d="M40 150 C 90 40, 140 180, 190 90 S 270 60, 280 70" fill="none" stroke="#264653" stroke-width="8" stroke-linecap="round"/><path d="M60 120 C 110 60, 160 150, 210 100" fill="none" stroke="#c1121f" stroke-width="4" stroke-linecap="round"/><circle cx="250" cy="140" r="14" fill="none" stroke="#2a9d8f" stroke-width="6"/></svg>',
	);

const drawingGame: GameDefinition = {
	id: "drawing",
	name: "Drawing",
	description:
		"在桌面纸面上即兴涂鸦：笔刷、橡皮、撤销重做，匿名可画，草稿自动保存；登录后可提交到公共画布（P1）。",
	preview: DRAWING_PREVIEW,
	GameView: DrawingGame,
	desktopOnly: true,
	isDefault: true,
};

/** 游戏注册表：唯一事实源（大厅、路由挂载、M3D 纸堆共用）。 */
export const GAME_REGISTRY: GameDefinition[] = [drawingGame];

export function getGame(id: string): GameDefinition | undefined {
	return GAME_REGISTRY.find((game) => game.id === id);
}

/** 默认游戏兜底：首个 isDefault 或注册表第一项。 */
export function getDefaultGame(): GameDefinition {
	return (
		GAME_REGISTRY.find((game) => game.isDefault) ?? GAME_REGISTRY[0]
	);
}
