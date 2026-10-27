"use client";

import { Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { authApi } from "@/api/authApi";
import { ApiError } from "@/api/response";
import { PixelPromptInput } from "@/components/pixel";
import { useSession } from "@/hooks/useSession";
import {
	SHELL_NAV_ITEMS,
	uniqueCommands,
	type ShellArticle,
} from "./shellUtils";
import {
	authCompletionCandidates,
	authHelpLines,
	nearMissCommand,
	toHelpLine,
} from "./terminal/commands";
import {
	TerminalOutput,
	type TerminalOutputLine,
	type TerminalTone,
} from "./terminal/TerminalOutput";

const stripTrailingSlash = (value: string) =>
	value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;

/** help 输出由 SHELL_NAV_ITEMS 派生 cd 行，新增页面自动出现在帮助里。 */
const getHelpLines = (): string[] => {
	const lines = ["Available commands:"];
	const labelByHref = new Map([
		["/", "return welcome page"],
		["/articles", "open article list"],
		["/games", "open game arcade"],
	]);
	for (const item of SHELL_NAV_ITEMS) {
		lines.push(toHelpLine(item.command, labelByHref.get(item.href) ?? item.label));
	}
	lines.push(
		toHelpLine("open latest", "open latest article"),
		toHelpLine("open <article>", "open article by id/title"),
		toHelpLine("open prev", "open previous article"),
		toHelpLine("open next", "open next article"),
		toHelpLine("exit", "leave current article buffer"),
		toHelpLine("clear", "clear terminal output"),
		toHelpLine("help", "show this help"),
		// 登录相关命令来自 terminal/commands 注册表（help / 补全 / 执行同源）。
		...authHelpLines(),
	);
	return lines;
};

const normalizeCommand = (value: string) => value.trim().replace(/\s+/g, " ");

const toCommandSlug = (value: string) =>
	value.trim().toLowerCase().replace(/\s+/g, "-");

/** 整页跳转：模块级函数持有对 window.location 的修改，避免在组件内直接赋值。 */
function redirectTo(url: string): void {
	window.location.href = url;
}

/**
 * 登录失败的终端文案（英文小写）。
 *
 * 401 凭证错、429 限流、其它（契约异常/网络）必须区分：以前一律 `invalid
 * credentials`，被限流的人会一直重试到窗口过期（工单 #16）。
 */
const loginErrorMessage = (error: unknown): string => {
	if (error instanceof ApiError) {
		if (error.status === 401) return "invalid credentials";
		if (error.status === 429) return "too many attempts, try again later";
		return error.message || "sign in failed";
	}
	return error instanceof Error && error.message ? error.message : "sign in failed";
};

/**
 * 终端交互态：命令行 / 登录用户名 / 登录密码。
 *
 * 密码登录以前只有一个隐式 `inputMode === "password"` 布尔值，用户名只能从
 * `login -u <name>` 里来；没有用户名时会把空串发给后端（HTTP 200 +
 * `{code:400}`，被旧解析当成功，token 写成 "undefined"）。现在缺用户名时先
 * 进 `username` 步，再也不会发空用户名。
 */
type PromptState =
	| { kind: "command" }
	| { kind: "username" }
	| { kind: "password"; username: string };

export function TerminalCommandBar({
	cwd,
	commands,
	articles = [],
	currentArticleId,
}: {
	cwd: string;
	commands: string[];
	articles?: ShellArticle[];
	currentArticleId?: number;
}) {
	const router = useRouter();
	const session = useSession();
	const inputRef = useRef<HTMLInputElement | null>(null);
	// 输出行必须带稳定 id（`key={text}` 会让重复行撞 key，见 TerminalOutput）。
	const lineSeq = useRef(0);
	const [command, setCommand] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [prompt, setPrompt] = useState<PromptState>({ kind: "command" });
	const [usernameDraft, setUsernameDraft] = useState("");
	const [password, setPassword] = useState("");
	// 进入密码模式时记住用户名，`login -u`（不带用户名）缺省复用。
	const [passwordUsername, setPasswordUsername] = useState("");
	// 提交期间忽略按键（不再用 disabled，避免失焦）。
	const [busy, setBusy] = useState(false);
	const [output, setOutput] = useState<TerminalOutputLine[]>([]);
	// 交互提示行（`username:` / `password for x:` + 失败原因）随交互态生灭，
	// 与历史输出分开：取消/重试不会抹掉上面已经打印的内容。
	const [promptLines, setPromptLines] = useState<TerminalOutputLine[]>([]);

	const promptUser =
		session.status === "authed" && session.user
			? session.user.username
			: "guest";

	const availableCommands = uniqueCommands([
		...commands,
		...articles.map((article) => `open ${article.title}`),
		...authCompletionCandidates(),
	]);
	const normalizedInput = command.trim().toLowerCase();
	const visibleCandidates =
		prompt.kind === "command" && normalizedInput
			? availableCommands
					.filter((item) => item.toLowerCase().includes(normalizedInput))
					.slice(0, 8)
			: [];

	const makeLine = (text: string, tone: TerminalTone = "info"): TerminalOutputLine => {
		lineSeq.current += 1;
		return { id: `line-${lineSeq.current}`, text, tone };
	};

	const print = (text: string, tone: TerminalTone = "info") =>
		setOutput((lines) => [...lines, makeLine(text, tone)]);

	const resetPrompt = () => {
		setPrompt({ kind: "command" });
		setPassword("");
		setPromptLines([]);
	};

	const startPasswordMode = (username: string) => {
		setPasswordUsername(username);
		setPassword("");
		setPrompt({ kind: "password", username });
		setPromptLines([makeLine(`password for ${username}:`)]);
	};

	const startUsernameMode = () => {
		setUsernameDraft(passwordUsername);
		setPassword("");
		setPrompt({ kind: "username" });
		setPromptLines([makeLine("username:")]);
	};

	const submitPassword = async () => {
		if (busy || prompt.kind !== "password") return;
		if (!password) {
			// 空回车取消回命令模式（历史输出保留）。
			resetPrompt();
			return;
		}
		const passwordLabel = `password for ${prompt.username}:`;
		setBusy(true);
		setPromptLines([makeLine(passwordLabel), makeLine("signing in…")]);
		try {
			const data = await authApi.login({
				username: prompt.username,
				password,
				remember: false,
			});
			session.login(data.token, {
				username: prompt.username,
				provider: "password",
			});
			router.push("/admin");
		} catch (error) {
			// 失败留在密码模式可重试，清空已输入密码并把真实原因打出来。
			setBusy(false);
			setPassword("");
			setPromptLines([
				makeLine(passwordLabel),
				makeLine(loginErrorMessage(error), "error"),
			]);
		}
	};

	const submitUsername = () => {
		const username = usernameDraft.trim().toLowerCase();
		if (!username) {
			resetPrompt();
			return;
		}
		startPasswordMode(username);
	};

	const executeCommand = (rawCommand: string) => {
		const nextCommand = normalizeCommand(rawCommand);
		if (!nextCommand) return;

		setCommand("");
		setActiveIndex(0);
		setPromptLines([]);

		// login/logout/whoami 大小写与空格归一化后匹配。
		const commandKey = nextCommand.toLowerCase();

		if (commandKey === "login" || commandKey === "login github") {
			if (session.status === "authed" && session.user) {
				print(`already logged in as ${session.user.username}, use logout first`);
				return;
			}
			print("opening GitHub authorization…");
			// 仅传站内路径（pathname + search）；未配置的降级由后端 302 回
			// /auth/callback?error=not_configured（站点自己的错误 UI）。
			redirectTo(
				authApi.buildGithubAuthorizeUrl(
					`${window.location.pathname}${window.location.search}`,
				),
			);
			return;
		}

		if (commandKey === "login -u" || commandKey.startsWith("login -u ")) {
			if (session.status === "authed" && session.user) {
				// 与 GitHub 分支一致：已登录不再进密码模式（改密码要先 logout）。
				print(`already logged in as ${session.user.username}, use logout first`);
				return;
			}
			const username =
				commandKey === "login -u"
					? passwordUsername
					: commandKey.slice("login -u ".length).trim();
			if (!username) {
				// 没有可复用用户名：先问用户名，绝不把空串发给后端。
				startUsernameMode();
				return;
			}
			startPasswordMode(username);
			return;
		}

		if (commandKey === "logout") {
			if (session.status === "authed") {
				session.logout();
				print("logged out");
			} else {
				print("not logged in");
			}
			return;
		}

		if (commandKey === "whoami") {
			if (session.status === "authed" && session.user) {
				const kind =
					session.user.provider === "password" ? "admin" : session.user.provider;
				print(`${session.user.username} (${kind})`);
			} else {
				print("not logged in");
			}
			return;
		}

		if (nextCommand === "cd projects/" || nextCommand === "cd projects") {
			router.push("/projects");
			return;
		}

		const navMatch = SHELL_NAV_ITEMS.find(
			(item) =>
				stripTrailingSlash(nextCommand.toLowerCase()) ===
				stripTrailingSlash(item.command),
		);
		if (navMatch) {
			router.push(navMatch.href);
			return;
		}

		// 保留历史短别名：home/about 与 'cd about' 同义。
		if (nextCommand === "home" || nextCommand === "about") {
			router.push("/");
			return;
		}

		if (nextCommand === "exit" || nextCommand === "back") {
			router.push("/articles");
			return;
		}

		if (nextCommand === "open latest") {
			const latest = articles[0];
			router.push(latest ? `/articles/${latest.id}` : "/articles");
			return;
		}

		if (nextCommand === "open prev" || nextCommand === "open next") {
			const index = articles.findIndex(
				(article) => article.id === currentArticleId,
			);
			if (index !== -1) {
				const neighbor =
					articles[nextCommand === "open prev" ? index - 1 : index + 1];
				if (neighbor) {
					router.push(`/articles/${neighbor.id}`);
					return;
				}
			}
			print(
				nextCommand === "open prev" ? "no previous article" : "no next article",
			);
			return;
		}

		if (
			nextCommand.startsWith("open ") &&
			nextCommand !== "open latest" &&
			nextCommand !== "open prev" &&
			nextCommand !== "open next"
		) {
			const target = nextCommand.replace(/^open\s+/, "").trim();
			if (/^\d+$/.test(target)) {
				router.push(`/articles/${target}`);
				return;
			}
			const matchedArticle = articles.find(
				(article) =>
					article.title === target ||
					toCommandSlug(article.title) === toCommandSlug(target),
			);
			if (matchedArticle) {
				router.push(`/articles/${matchedArticle.id}`);
				return;
			}
		}

		if (nextCommand === "clear") {
			setOutput([]);
			return;
		}

		if (nextCommand === "help") {
			setOutput(getHelpLines().map((line) => makeLine(line)));
			return;
		}

		print(`command not found: ${nextCommand}`, "error");
		// 近似命令提示：`login google` 这种首词存在的输入直接指出正确命令，
		// 否则用户只会看到 not found 却不知道差在哪。
		const hint = nearMissCommand(nextCommand);
		if (hint) print(`hint: ${hint}`);
	};

	const completeCommand = () => {
		if (visibleCandidates.length === 0) return;
		const active = visibleCandidates[activeIndex] || visibleCandidates[0];
		setCommand(active);
	};

	const submitCurrentPrompt = () => {
		if (busy) return;
		if (prompt.kind === "password") {
			void submitPassword();
			return;
		}
		if (prompt.kind === "username") {
			submitUsername();
			return;
		}
		const active = visibleCandidates[activeIndex];
		executeCommand(active || command);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (busy) return;

		if (event.key === "Escape" && prompt.kind !== "command") {
			event.preventDefault();
			resetPrompt();
			return;
		}

		if (prompt.kind !== "command") return;

		if (event.key === "Tab") {
			event.preventDefault();
			completeCommand();
			return;
		}

		if (event.key === "ArrowDown" && visibleCandidates.length > 0) {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % visibleCandidates.length);
			return;
		}

		if (event.key === "ArrowUp" && visibleCandidates.length > 0) {
			event.preventDefault();
			setActiveIndex(
				(index) =>
					(index - 1 + visibleCandidates.length) % visibleCandidates.length,
			);
		}
	};

	const activeValue =
		prompt.kind === "password"
			? password
			: prompt.kind === "username"
				? usernameDraft
				: command;

	const onValueChange = (value: string) => {
		if (prompt.kind === "password") {
			setPassword(value);
			return;
		}
		if (prompt.kind === "username") {
			setUsernameDraft(value);
			return;
		}
		setCommand(value);
		setActiveIndex(0);
	};

	return (
		<Box
			sx={{
				borderTop: 1,
				borderColor: "divider",
				bgcolor: "background.paper",
				px: 1.5,
				py: 1,
				flexShrink: 0,
			}}
		>
			<TerminalOutput lines={[...output, ...promptLines]} />

			{visibleCandidates.length > 0 && (
				<Box
					role="listbox"
					aria-label="Command suggestions"
					sx={{
						mb: 0.75,
						maxHeight: { xs: "28dvh", sm: "36vh" },
						overflow: "auto",
						fontFamily: "JetBrains Mono, monospace",
						fontSize: "0.75rem",
						lineHeight: 1.45,
						color: "text.secondary",
					}}
				>
					{visibleCandidates.map((candidate, index) => (
						<Box
							component="div"
							role="option"
							aria-selected={index === activeIndex}
							key={candidate}
							onMouseDown={(event) => {
								event.preventDefault();
								executeCommand(candidate);
							}}
							sx={{
								display: "grid",
								gridTemplateColumns: "16px minmax(0, 1fr)",
								cursor: "default",
								color:
									index === activeIndex ? "text.primary" : "text.secondary",
								bgcolor:
									index === activeIndex
										? "rgba(88, 166, 255, 0.12)"
										: "transparent",
								px: 0.25,
							}}
						>
							<Box
								component="span"
								sx={{
									color:
										index === activeIndex ? "primary.main" : "text.disabled",
								}}
							>
								{index === activeIndex ? "▸" : ""}
							</Box>
							<Box component="span">{candidate}</Box>
						</Box>
					))}
				</Box>
			)}

			<PixelPromptInput
				prompt={`${promptUser}@${cwd} $`}
				value={activeValue}
				onChange={onValueChange}
				onSubmit={submitCurrentPrompt}
				onKeyDown={onKeyDown}
				mode={prompt.kind === "password" ? "secret" : "text"}
				busy={busy}
				inputRef={inputRef}
				ariaLabel={
					prompt.kind === "password" ? "Password" : "Terminal command"
				}
				// 桌面精细指针 + 当前没有别的输入在用时才自动聚焦：进入站点即
				// 可打字、刷新/路由切换后不丢，且绝不抢评论框等已有焦点。
				autoFocusPolicy="fine-pointer"
			/>
		</Box>
	);
}
