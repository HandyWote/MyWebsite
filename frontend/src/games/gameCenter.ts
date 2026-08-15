import type { GameDefinition } from "./types";

/**
 * M3D 纸堆游戏中心预留接口（P0 仅类型，不实现纸堆动画）。
 * World/PublicExperience 不得因空实现报错。
 */
export interface GameCenterCallbacks {
	/** M3D 纸堆选中某游戏（纸盖向主纸面时触发，P0 无纸堆，由路由/大厅直达代替）。 */
	onSelectGame(id: string): void;
}

export interface GameCenterApi {
	/** 注册表驱动：返回当前纸堆应展示的游戏列表（P0 无实现，类型先定）。 */
	listGames(): GameDefinition[];
	/** 打开/收回纸堆（M3D 实现，P0 空实现）。 */
	open(): void;
	close(): void;
}
