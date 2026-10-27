import { expect, test, type Page } from "@playwright/test";

// 终端聚焦（工单 #16）：进入站点即聚焦、刷新不丢、3D 模型接管后不丢、
// 软导航后新输入框聚焦；移动端（pointer: coarse）**不**自动聚焦，避免弹软键盘。
//
// 为什么必须 e2e：jsdom 里没有 CSS3DRenderer 的 DOM 搬家（`appendChild` 会 blur
// 已聚焦元素），单测用 `preserveFocusAcrossMove` 的注入点覆盖，真实浏览器行为只有
// Playwright 能验。桌面用例必须等 `desktop-ready`（= 电脑模型加载完成、`#screen-host`
// 被搬进 CSS3DObject 之后），否则「聚焦被搬家吃掉」这条恰恰测不到。

const host = (page: Page) => page.locator("#screen-host");
const terminalInput = (page: Page) => host(page).getByLabel("Terminal command");
const desktopReady = (page: Page) =>
	page.locator('[data-public-experience="desktop-ready"]');

test("desktop 3D: the terminal is focused after the model takes over the DOM", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	await page.goto("/");
	await expect(desktopReady(page)).toHaveCount(1, { timeout: 45_000 });

	await expect(terminalInput(page)).toBeFocused();
});

test("desktop 3D: focus survives a full reload", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	await page.goto("/");
	await expect(desktopReady(page)).toHaveCount(1, { timeout: 45_000 });
	await expect(terminalInput(page)).toBeFocused();

	await page.reload();
	await expect(desktopReady(page)).toHaveCount(1, { timeout: 45_000 });

	await expect(terminalInput(page)).toBeFocused();
});

test("desktop 3D: soft navigation focuses the new terminal input", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	await page.goto("/");
	await expect(desktopReady(page)).toHaveCount(1, { timeout: 45_000 });

	const input = terminalInput(page);
	await expect(input).toBeFocused();
	await input.fill("cd articles/");
	await input.press("Enter");

	await expect(page).toHaveURL(/\/articles$/, { timeout: 20_000 });
	await expect(terminalInput(page)).toBeFocused();
});

test("mobile: the terminal is not focused automatically", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "mobile-chrome");
	await page.goto("/");
	await expect(terminalInput(page)).toBeVisible();

	// 负向断言没有 toBeFocused 的等待语义：给水合留出时间后直接读 activeElement。
	await page.waitForTimeout(1500);
	const focused = await terminalInput(page).evaluate(
		(element) => element === document.activeElement,
	);
	expect(focused).toBe(false);
});
