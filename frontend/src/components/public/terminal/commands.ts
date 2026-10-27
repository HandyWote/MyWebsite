/**
 * 终端命令注册表（唯一事实源）。
 *
 * 与 `SHELL_NAV_ITEMS`（导航）同一模式：help 行、Tab 补全候选、未知命令的
 * “did you mean” 提示三处都从这里派生，新增/改名命令只改这张表——
 * 2026-08 之前 help 里硬编码三行、补全另写一份数组，导致
 * `login github` 有实现却没写进 help、`login -u` 在补全里被导向 GitHub。
 *
 * 执行分支仍在 TerminalCommandBar（需要 router / articles 上下文），
 * 但**文案与可见性不允许再散写**。
 */
export type TerminalCommandSpec = {
	/** 稳定标识，仅用于测试与去重。 */
	id: string;
	/** 键入形式，同时是补全候选与 help 的左侧列。 */
	usage: string;
	/** help 行说明；缺省 = 有意隐藏，不写进 help。 */
	summary?: string;
	/** 是否出现在 Tab 补全候选里。 */
	complete: boolean;
	/** 近似提示用的首个词（`login google` → `login`）。 */
	word: string;
};

/**
 * 登录相关命令。
 *
 * `login -u <username>`（管理员密码登录）**维持不在 help 暴露**：
 * 依据 a4d5100 的取舍（终端提示不公开暴露管理员入口），且 `/admin` 未登录
 * 时不显示登录表单。翻回来只需把 summary 补上一行，见工单 #16 决策评论。
 */
export const AUTH_COMMANDS: readonly TerminalCommandSpec[] = [
	{ id: "login", usage: "login", summary: "sign in with GitHub", complete: true, word: "login" },
	// 别名：与 `login` 同一分支，补全里保留（用户可能已经习惯），但不重复占 help 行。
	{ id: "login-github", usage: "login github", complete: true, word: "login" },
	// 隐藏：管理员密码登录。
	{ id: "login-password", usage: "login -u <username>", complete: false, word: "login" },
	{ id: "logout", usage: "logout", summary: "sign out", complete: true, word: "logout" },
	{ id: "whoami", usage: "whoami", summary: "show current user", complete: true, word: "whoami" },
] as const;

/** help 表格的列宽：导航行（SHELL_NAV_ITEMS）与本表共用，避免错列。 */
export const COMMAND_COLUMN_WIDTH = 18;

/** 命令到 help 行的统一排版（左列补空格到 COMMAND_COLUMN_WIDTH）。 */
export const toHelpLine = (usage: string, summary: string): string =>
	`  ${usage.padEnd(COMMAND_COLUMN_WIDTH, " ")}${summary}`;

/** 出现在 help 里的命令（按注册表顺序）。 */
export const authHelpLines = (): string[] =>
	AUTH_COMMANDS.filter((command) => command.summary !== undefined).map((command) =>
		toHelpLine(command.usage, command.summary as string),
	);

/** Tab 补全候选。 */
export const authCompletionCandidates = (): string[] =>
	AUTH_COMMANDS.filter((command) => command.complete).map(
		(command) => command.usage,
	);

/**
 * 未知命令的近似提示：首词命中注册表时给出真实存在的命令，
 * `login google` → `login`（否则用户会被“command not found”卡死）。
 */
export const nearMissCommand = (input: string): string | undefined => {
	const head = input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
	if (!head) return undefined;
	const match = AUTH_COMMANDS.find(
		(command) => command.word === head && command.usage === head,
	);
	return match?.usage;
};
