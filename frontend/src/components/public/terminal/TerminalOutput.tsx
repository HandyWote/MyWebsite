"use client";

import { Box } from "@mui/material";

/** 输出行语气：`error` 用于失败/拒绝，其余按次要文本渲染。 */
export type TerminalTone = "info" | "error";

/**
 * 一行输出必须带稳定 id：旧实现用 `key={line}`，一旦出现重复文本
 * （例如保留历史后连续两次 `password:`）就会撞 key 并丢行。
 */
export interface TerminalOutputLine {
	id: string;
	text: string;
	tone?: TerminalTone;
}

/** 终端输出区（唯一实现）：滚动上限、等宽字体、保留换行。 */
export function TerminalOutput({
	lines,
}: {
	lines: readonly TerminalOutputLine[];
}) {
	if (lines.length === 0) return null;
	return (
		<Box
			data-terminal-output
			sx={{
				mb: 0.75,
				maxHeight: { xs: "24dvh", sm: "32vh" },
				overflow: "auto",
				fontFamily: "JetBrains Mono, monospace",
				fontSize: "0.75rem",
				lineHeight: 1.45,
				whiteSpace: "pre-wrap",
			}}
		>
			{lines.map((line) => (
				<Box
					component="div"
					key={line.id}
					sx={{ color: line.tone === "error" ? "error.main" : "text.secondary" }}
				>
					{line.text}
				</Box>
			))}
		</Box>
	);
}
