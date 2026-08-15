/**
 * 游戏宿主契约（P0 计划 Task 2）。
 *
 * CSS3DObject 的 DOM transform 已自动处理坐标：宿主内 pointer 事件即纸面
 * 本地坐标，游戏无需三维↔二维换算。宿主容器 `#paper-screen-host` 常驻，
 * 由 PaperScreen（three）接管其尺寸与 clip-path 裁剪。
 */
export interface PaperGameHost {
	/** 把游戏根元素挂进 #paper-screen-host（桌面 3D 纸面）。 */
	mount(element: HTMLElement): void;
	/** 卸载并清理（模式切换/销毁/切换游戏时调用）。 */
	unmount(): void;
	/** 纸面尺寸（L1×L2 CSS 像素，host 已按纸形 clip-path 裁剪）。 */
	getSize(): { width: number; height: number };
}
