import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * P0 画板游戏路由验收（G6）：
 * - /games 大厅由注册表驱动；未知 id 404
 * - 桌面 project：纸面挂载画板，pointer 可绘制、草稿落盘、刷新静默恢复
 *   （无按钮 toast 告知，4s 自动消失且不拦截绘制）、撤销重做
 * - 纸面特写：悬停进入 paper 视角后宿主搬进屏幕 2D 聚焦层，
 *   原命中死区（中下部）可真实绘制；退出时宿主同步搬回 CSS3D
 *
 * 相机注意事项（PaperPointerTracker / MonitorPointerTracker / Camera）：
 * - idle 关键帧持续正弦漂移 + desk 视角鼠标跟随视差 → 纸面投影永不稳定，
 *   locator.click() 的稳定性检查必然超时，一律用鼠标坐标事件。
 * - 纸面是 CSS3D 透视四边形，boundingBox() 只是轴对齐外接矩形；
 *   绘制前用 elementFromPoint 探测出验证在画布上的点，不信任包围盒。
 * - idle 视角纸面仅 ~26px 且被换行工具栏覆盖，先点击空白切 desk 视角
 *   （纸面 ~280px）再交互；纸面交互已被吞事件，不会再切走视角。
 * - paper 特写（PaperFocusLayer）：settle 后宿主进入无 3D 变换的 2D 层，
 *   命中测试全表面可靠；相机静止，投影稳定可直接探测。
 */

async function waitForDesktopDrawingBoard(page: Page): Promise<Locator> {
	await expect(
		page.locator('[data-public-experience="desktop-ready"]'),
	).toBeVisible({ timeout: 30_000 });
	const board = page.locator('#paper-screen-host [data-game="drawing"]');
	await expect(board).toBeVisible({ timeout: 15_000 });
	// PaperScreen 接管后 ResizeObserver 驱动 canvas 铺满纸面
	await expect
		.poll(
			async () => {
				const box = await board.locator("canvas").boundingBox();
				return box && box.width > 0 && box.height > 0 ? box.width : 0;
			},
			{ timeout: 15_000, message: "paper canvas should project onto the screen" },
		)
		.toBeGreaterThan(0);
	return board;
}

/** 进入 desk 视角：点击左上角空白（screen-host 与纸面之外）触发
 *  toggleDeskView；纸面交互已被 PaperPointerTracker 吞掉不会再切视角。
 *  鼠标停在屏幕中心让 desk 视差的跟随目标收敛到桌面中心。 */
async function enterDeskView(page: Page, canvas: Locator): Promise<void> {
	await page.mouse.click(24, 24);
	const viewport = page.viewportSize();
	await page.mouse.move(viewport!.width / 2, viewport!.height / 2);
	await expect
		.poll(
			async () => {
				const box = await canvas.boundingBox();
				return box ? Math.round(box.width) : 0;
			},
			{ timeout: 15_000, message: "desk view should enlarge the paper" },
		)
		.toBeGreaterThan(150);
}

/** 相机缓动/视差可能改变纸面投影，等待连续两次采样稳定。 */
async function waitForPaperSettled(page: Page, canvas: Locator): Promise<void> {
	await expect
		.poll(
			async () => {
				const first = await canvas.boundingBox();
				await page.waitForTimeout(500);
				const second = await canvas.boundingBox();
				if (!first || !second) return false;
				return (
					Math.abs(first.x - second.x) < 2 &&
					Math.abs(first.y - second.y) < 2 &&
					Math.abs(first.width - second.width) < 2
				);
			},
			{ timeout: 15_000, message: "paper projection should settle" },
		)
		.toBe(true);
}

/** 在画布的包围盒内按候选比例探测一个 elementFromPoint 命中画布的
 *  屏幕坐标（验证落在 CSS3D 四边形内，而非仅在外接矩形内）。 */
async function probeCanvasPoint(
	page: Page,
	canvas: Locator,
	fractions: Array<[number, number]>,
): Promise<{ x: number; y: number }> {
	const handle = await canvas.elementHandle();
	expect(handle).not.toBeNull();
	const point = await handle!.evaluate((element, candidates) => {
		const rect = element.getBoundingClientRect();
		for (const [fx, fy] of candidates) {
			const x = rect.x + rect.width * fx;
			const y = rect.y + rect.height * fy;
			if (
				x >= 0 &&
				y >= 0 &&
				x < window.innerWidth &&
				y < window.innerHeight &&
				document.elementFromPoint(x, y) === element
			) {
				return { x, y };
			}
		}
		return null;
	}, fractions);
	await handle!.dispose();
	expect(point, "probe must find a verified on-canvas point").not.toBeNull();
	return point!;
}

/** 探测候选（覆盖包围盒中下区域为主，避开顶部工具栏）：视角无关，
 *  任何相机状态下只要纸面有可见区域就能命中 CSS3D 四边形。 */
const PROBE_POOL: Array<[number, number]> = [
	[0.3, 0.6],
	[0.5, 0.55],
	[0.7, 0.6],
	[0.2, 0.7],
	[0.4, 0.72],
	[0.6, 0.7],
	[0.8, 0.68],
	[0.25, 0.85],
	[0.45, 0.85],
	[0.65, 0.85],
	[0.15, 0.55],
	[0.85, 0.55],
	[0.4, 0.45],
	[0.6, 0.45],
	[0.3, 0.35],
	[0.7, 0.35],
];

async function drawStrokeOnPaper(page: Page, canvas: Locator): Promise<void> {
	// 起/终点均经 elementFromPoint 验证在画布四边形上（不信任包围盒）。
	const start = await probeCanvasPoint(page, canvas, PROBE_POOL);
	const end = await probeCanvasPoint(page, canvas, [...PROBE_POOL].reverse());
	// 保证起终点不重合：反向探测命中同一格时向右下小位移
	const endX = start.x === end.x && start.y === end.y ? end.x + 4 : end.x;
	const endY = start.x === end.x && start.y === end.y ? end.y + 4 : end.y;

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(endX, endY, { steps: 8 });
	await page.mouse.up();
}

/** 工具栏按钮在倾斜视角下可能无可靠的屏幕命中区（CSS3D 透视四边形），
 *  用 DOM 合成点击直达 onClick；真实指针交互已由绘制动作覆盖。 */
async function toolbarClick(locator: Locator): Promise<void> {
	await locator.evaluate((element) => {
		(element as HTMLElement).click();
	});
}

/** 悬停纸面中心：pointermove 射线命中纸面网格触发 enterPaper，
 *  相机飞行 settle 后 PaperFocusLayer 把宿主搬进屏幕 2D 层。 */
async function enterPaperFocus(page: Page): Promise<Locator> {
	const host = page.locator("#paper-screen-host");
	const center = await host.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	});
	await page.mouse.move(center.x, center.y);
	const focusLayer = page.locator("[data-paper-focus-layer]");
	await expect(focusLayer).toHaveCount(1, {
		timeout: 15_000,
	});
	return focusLayer;
}

function draftStrokeCount(page: Page) {
	return page.evaluate(() => {
		const raw = window.localStorage.getItem("game:drawing:draft");
		if (raw === null) return 0;
		try {
			const parsed = JSON.parse(raw) as { strokes?: unknown[] };
			return Array.isArray(parsed.strokes) ? parsed.strokes.length : -1;
		} catch {
			return -1;
		}
	});
}

test("games hall lists the registry games", async ({ page }, testInfo) => {
	await page.goto("/games");
	if (testInfo.project.name === "desktop-chrome") {
		await expect(
			page.locator('[data-public-experience="desktop-ready"]'),
		).toBeVisible({ timeout: 30_000 });
	} else {
		await expect(
			page.locator('[data-public-experience="ordinary"]'),
		).toBeVisible();
	}

	const card = page.locator('[data-game-card="drawing"]');
	await expect(card).toBeVisible();
	await expect(card).toContainText("Drawing");
	await expect(page.getByText(/found 1 game/)).toBeVisible();
});

test("non-desktop hall navigates into the game page", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/games");
	await page.locator('[data-game-card="drawing"]').click();
	await expect(page).toHaveURL(/\/games\/drawing$/);
	await expect(page.locator("[data-game-detail-view]")).toBeVisible();
});

test("non-desktop renders the detail-view placeholder and never mounts the board", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/games/drawing");
	await expect(page.locator('[data-public-experience="ordinary"]')).toBeVisible();

	// 查看模式占位可见、说明块隐藏、纸面不挂载游戏
	await expect(page.locator("[data-game-detail-view]")).toBeVisible();
	await expect(page.locator("[data-game-detail-view]")).toContainText(
		"需要桌面 3D 纸面体验",
	);
	await expect(page.locator("[data-game-description]")).not.toBeVisible();
	await expect(
		page.locator('#paper-screen-host [data-game="drawing"]'),
	).toHaveCount(0);
});

test("unknown game id renders the 404 page", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/games/nope");
	await expect(page.getByRole("heading", { name: /404/i })).toBeVisible();
	await expect(page).toHaveURL(/\/games\/nope$/);
});

test("desktop mounts the drawing board on the paper: draw, draft, reload, undo", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");

	await page.goto("/games/drawing");
	const board = await waitForDesktopDrawingBoard(page);
	const canvas = board.locator("canvas");

	// 工具条契约：颜色/笔宽/橡皮/提交占位
	await expect(board.locator('[data-tool="color"][data-color="#264653"]')).toBeVisible();
	await expect(board.locator('[data-tool="width"][data-width="0.02"]')).toBeVisible();
	await expect(board.locator('[data-tool="eraser"]')).toBeVisible();
	await expect(board.locator('[data-action="submit"]')).toBeDisabled();

	// 切到 desk 视角（idle 视角纸面仅 ~26px，无法可靠交互）
	await enterDeskView(page, canvas);

	// 画一笔
	await waitForPaperSettled(page, canvas);
	await drawStrokeOnPaper(page, canvas);
	await expect(board).toHaveAttribute("data-stroke-count", "1");

	// 草稿防抖落盘（500ms 窗口）
	await expect
		.poll(() => draftStrokeCount(page), { timeout: 5_000 })
		.toBe(1);

	// 刷新后草稿静默恢复（P0 第二轮：无按钮 toast，不再有 continue/discard）
	await page.reload();
	const boardAfterReload = await waitForDesktopDrawingBoard(page);
	const canvasAfterReload = boardAfterReload.locator("canvas");
	// 笔画挂载即就位，无需任何确认操作
	await expect(boardAfterReload).toHaveAttribute("data-stroke-count", "1");

	// 恢复 toast：出现、无按钮、pointerEvents 穿透（命中画布而非 toast）
	const toast = boardAfterReload.locator('[data-draft-toast="restored"]');
	await expect(toast).toBeVisible();
	await expect(toast).toContainText("saved on this device");
	const hitAtToast = await toast.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const hit = document.elementFromPoint(
			rect.x + rect.width / 2,
			rect.y + rect.height / 2,
		);
		return hit ? hit.tagName.toLowerCase() : "none";
	});
	expect(hitAtToast).toBe("canvas");
	// 4s 后自动消失
	await expect(toast).toBeHidden({ timeout: 8_000 });

	// 再画一笔，撤销/重做
	await enterDeskView(page, canvasAfterReload);
	await waitForPaperSettled(page, canvasAfterReload);
	await drawStrokeOnPaper(page, canvasAfterReload);
	await expect(boardAfterReload).toHaveAttribute("data-stroke-count", "2");

	await toolbarClick(boardAfterReload.locator('[data-action="undo"]'));
	await expect(boardAfterReload).toHaveAttribute("data-stroke-count", "1");
	await toolbarClick(boardAfterReload.locator('[data-action="redo"]'));
	await expect(boardAfterReload).toHaveAttribute("data-stroke-count", "2");
});

test("desktop paper focus: host swaps into the 2D layer and the dead zone becomes drawable", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	test.setTimeout(90_000);

	await page.goto("/games/drawing");
	const board = await waitForDesktopDrawingBoard(page);
	const canvas = board.locator("canvas");
	await enterDeskView(page, canvas);
	await waitForPaperSettled(page, canvas);

	// 悬停纸面 → enterPaper → settle 后宿主搬进屏幕 2D 聚焦层
	await enterPaperFocus(page);

	// 接管断言：宿主在层内，CSS3D 场景由占位元素顶替
	await expect(
		page.locator("[data-paper-focus-layer] #paper-screen-host"),
	).toHaveCount(1);
	await expect(
		page.locator('[data-three-css-renderer="paper"] #paper-screen-host'),
	).toHaveCount(0);
	await expect(
		page.locator('[data-three-css-renderer="paper"] [data-paper-placeholder]'),
	).toHaveCount(1);

	// 修复前转写视角仅顶部约 1/3 可命中：在中下部（原死区）探测并真实绘制
	const point = await probeCanvasPoint(page, canvas, [
		[0.5, 0.8],
		[0.5, 0.75],
		[0.4, 0.7],
		[0.6, 0.72],
	]);
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 30, point.y - 20, { steps: 6 });
	await page.mouse.up();
	await expect(board).toHaveAttribute("data-stroke-count", "1");

	// 点击空白退出特写：宿主同步搬回 CSS3D（占位移除、层消失）
	await page.mouse.click(24, 24);
	await expect(page.locator("[data-paper-focus-layer]")).toHaveCount(0);
	await expect(
		page.locator('[data-three-css-renderer="paper"] #paper-screen-host'),
	).toHaveCount(1);
	await expect(
		page.locator('[data-three-css-renderer="paper"] [data-paper-placeholder]'),
	).toHaveCount(0);
});
