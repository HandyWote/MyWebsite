import type { SxProps, Theme } from "@mui/material";

export type ShellArticle = { id: number; title: string };

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
