import type { SxProps, Theme } from "@mui/material";

export type ShellArticle = { id: number; title: string };

/**
 * 站内导航唯一事实源：左侧 explorer、终端 cd 命令、404 页建议
 * 三处均从这里派生；新增页面只需在此追加一行。
 */
export const SHELL_NAV_ITEMS = [
	{ label: "articles", command: "cd articles/", href: "/articles" },
	{ label: "projects", command: "cd projects/", href: "/projects" },
	{ label: "games", command: "cd games/", href: "/games" },
	{ label: "about", command: "cd about/", href: "/" },
] as const;

export const uniqueCommands = (commands: string[]): string[] =>
	Array.from(new Set(commands.filter(Boolean)));

export const navButtonSx = (
	active: boolean,
	{ fontSize = "0.8125rem" }: { fontSize?: string } = {},
): SxProps<Theme> => ({
	display: "grid",
	gridTemplateColumns: "12px minmax(0, 1fr)",
	alignItems: "center",
	gap: 0.5,
	width: "100%",
	border: 0,
	bgcolor: active ? "rgba(88, 166, 255, 0.14)" : "transparent",
	color: active ? "text.primary" : "text.secondary",
	cursor: "pointer",
	fontFamily: "JetBrains Mono, monospace",
	fontSize,
	textAlign: "left",
	px: 0.5,
	py: 0.4,
	"&:hover": {
		bgcolor: "rgba(88, 166, 255, 0.08)",
		color: "primary.main",
	},
});
