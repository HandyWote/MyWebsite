import { expect, test, type Page, type TestInfo } from "@playwright/test";

// P1 登录体系端到端：终端 login / login -u / logout / whoami + /auth/callback 回跳。
// 运行在普通 DOM 布局（mobile / wide-touch）；桌面 3D 投影中的终端交互
// 由 public-experience.spec.ts 的 cd 导航覆盖。
// mock backend（e2e/mock-backend.mjs）模拟 GitHub OAuth：
// authorize 直接 302 回站内 /auth/callback，exchange 签发固定 token 并回传 redirect_to。

const host = (page: Page) => page.locator("#screen-host");

const terminalInput = (page: Page) => host(page).getByLabel("Terminal command");

async function runTerminal(page: Page, command: string) {
	const input = terminalInput(page);
	await input.fill(command);
	await input.press("Enter");
}

test.afterEach(async ({ request }) => {
	// 还原 mock 配置，避免影响其他测试。
	await request.post("/api/__mock/config", { data: { github_enabled: true } });
});

test("guest terminal: whoami/logout report not logged in, help lists auth commands", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/articles");
	await expect(terminalInput(page)).toBeVisible();
	await expect(host(page)).toContainText("guest@~/app/articles $");

	await runTerminal(page, "whoami");
	await expect(host(page)).toContainText("not logged in");

	await runTerminal(page, "logout");
	await expect(host(page)).toContainText("not logged in");

	await runTerminal(page, "help");
	await expect(host(page)).toContainText(
		"  login              sign in with GitHub",
	);
	// a4d5100 起 help 不再暴露 login -u（仅支持直接输入，见掩码密码用例）
	await expect(host(page)).toContainText("  logout             sign out");
	await expect(host(page)).toContainText("  whoami             show current user");
});

test("login -u shows a masked password prompt and Escape cancels it", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/");
	await expect(terminalInput(page)).toBeVisible();

	await runTerminal(page, "login -u admin");
	await expect(host(page)).toContainText("password:");
	const password = host(page).getByLabel("Password");
	await password.fill("secret");
	// 镜像层以 * 遮罩；真实 input 保留明文值（透明样式）。
	const mirror = password
		.locator("xpath=..")
		.locator('span[aria-hidden="true"]');
	await expect(mirror).toHaveText("*".repeat(6));
	await expect(password).toHaveValue("secret");

	await password.press("Escape");
	await expect(host(page)).not.toContainText("password:");
	await expect(terminalInput(page)).toBeVisible();
});

test("login -u retries after invalid credentials and lands on /admin", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/");
	await expect(terminalInput(page)).toBeVisible();

	await runTerminal(page, "login -u admin");
	const password = host(page).getByLabel("Password");
	await password.fill("wrong-password");
	await password.press("Enter");
	// 失败：留在密码模式可重试。
	await expect(host(page)).toContainText("invalid credentials");
	await expect(host(page)).toContainText("password:");
	await expect(password).toBeVisible();

	await password.fill("admin-pass");
	await password.press("Enter");
	// 成功：token 落地 → 直跳 /admin → RequireAuth 校验通过。
	await expect(page).toHaveURL(/\/admin\/sidebar$/, { timeout: 20_000 });
	await expect(page.getByText("左侧内容栏管理")).toBeVisible({
		timeout: 20_000,
	});
});

test("login redirects through the GitHub flow and returns to the source page signed in", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.goto("/articles?tab=1");
	await expect(terminalInput(page)).toBeVisible();

	await runTerminal(page, "login");
	// mock authorize 302 → /auth/callback?code=… → exchange → 跳回来源页（保留 query）。
	// （"opening GitHub authorization…" 是瞬时输出：跳转同步发生，e2e 不断言，单测已覆盖。）
	await expect(page).toHaveURL(/\/articles\?tab=1$/, { timeout: 20_000 });
	await expect(host(page)).toContainText("e2e-github-user@~/app/articles $");

	await runTerminal(page, "whoami");
	await expect(host(page)).toContainText("e2e-github-user (github)");

	await runTerminal(page, "login");
	await expect(host(page)).toContainText(
		"already logged in as e2e-github-user, use logout first",
	);
});

test("logout clears an existing session and reverts the prompt to guest", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.addInitScript(() => {
		window.localStorage.setItem("token", "mock-github-token");
	});
	await page.goto("/");
	await expect(host(page)).toContainText("e2e-github-user@~/app $");

	await runTerminal(page, "logout");
	await expect(host(page)).toContainText("logged out");
	await expect(host(page)).toContainText("guest@~/app $");

	await runTerminal(page, "whoami");
	await expect(host(page)).toContainText("not logged in");
});

test("login degrades to the backend message when GitHub OAuth is not configured", async ({
	page,
}, testInfo: TestInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	await page.request.post("/api/__mock/config", {
		data: { github_enabled: false },
	});
	await page.goto("/");
	await expect(terminalInput(page)).toBeVisible();

	await runTerminal(page, "login");
	// 终端照常跳转 authorize；未配置降级由后端 400 返回提示语（浏览器直接展示）。
	await expect(page).toHaveURL(/\/api\/auth\/github\/authorize/, {
		timeout: 15_000,
	});
	await expect(page.locator("body")).toContainText(
		"github oauth not configured",
		{ timeout: 15_000 },
	);
});
