"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navButtonSx, SHELL_NAV_ITEMS } from "./shellUtils";

// figlet standard 字体，404 / not found 两块堆叠（工具生成，勿手改字形）
const FIGLET_404 = String.raw` _  _    ___  _  _   `;
const FIGLET_404_L = String.raw`| || |  / _ \| || |  `;
const FIGLET_404_M = String.raw`| || |_| | | | || |_ `;
const FIGLET_404_N = String.raw`|__   _| |_| |__   _|`;
const FIGLET_404_B = String.raw`   |_|  \___/   |_|  `;

const FIGLET_NF_1 = String.raw` _ __   ___ | |_   / _| ___  _   _ _ __   __| |`;
const FIGLET_NF_2 = String.raw`| '_ \ / _ \| __| | |_ / _ \| | | | '_ \ / _` + "`" + ` |`;
const FIGLET_NF_3 = String.raw`| | | | (_) | |_  |  _| (_) | |_| | | | | (_| |`;
const FIGLET_NF_4 = String.raw`|_| |_|\___/ \__| |_|  \___/ \__,_|_| |_|\__,_|`;

/**
 * 404 页主体：页壳（explorer / 状态栏 / 终端命令条）由 PublicShell 提供，
 * 这里只渲染 cat 报错、figlet 标题与导航建议。
 */
export function TerminalNotFound() {
	const pathname = usePathname();
	const requested = pathname || "/";

	return (
		<Box
			data-testid="terminal-not-found"
			sx={{
				width: "min(100%, 820px)",
				mx: "auto",
				fontFamily: "JetBrains Mono, monospace",
			}}
		>
			<Typography
				component="h1"
				sx={{
					position: "absolute",
					width: 1,
					height: 1,
					margin: -1,
					padding: 0,
					overflow: "hidden",
					clip: "rect(0, 0, 0, 0)",
					whiteSpace: "nowrap",
					border: 0,
				}}
			>
				404 not found
			</Typography>
			<Box
				sx={{
					fontSize: { xs: "0.8125rem", sm: "0.875rem" },
					lineHeight: 1.7,
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
				}}
			>
				<Box sx={{ color: "text.disabled" }}>$ cat {requested}</Box>
				<Box sx={{ color: "error.main" }}>
					{`cat: ${requested}: No such file or directory`}
				</Box>
			</Box>

			<Box
				component="pre"
				data-testid="terminal-404-ascii"
				aria-hidden="true"
				sx={{
					m: 0,
					my: { xs: 2.5, sm: 3.5 },
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "clamp(0.45rem, 2.2vw, 1.05rem)",
					lineHeight: 0.85,
					whiteSpace: "pre",
					color: "text.primary",
				}}
			>
				<Box sx={{ color: "primary.main", display: "block" }}>
					{[
						FIGLET_404,
						FIGLET_404_L,
						FIGLET_404_M,
						FIGLET_404_N,
						FIGLET_404_B,
					].join("\n")}
				</Box>
				<Box sx={{ display: "block" }}>
					{[FIGLET_NF_1, FIGLET_NF_2, FIGLET_NF_3, FIGLET_NF_4].join("\n")}
				</Box>
			</Box>

			<Box
				sx={{
					fontSize: "0.875rem",
					lineHeight: 2,
				}}
			>
				<Box sx={{ color: "text.secondary" }}>
					hint: requested page does not exist
				</Box>
				<Box sx={{ color: "text.secondary", mt: 1 }}>did you mean:</Box>
				<Box sx={{ display: "grid", gap: 0.5, mt: 0.5, pl: 2 }}>
					{SHELL_NAV_ITEMS.map((item) => (
						<Box
							key={item.command}
							component={Link}
							href={item.href}
							sx={{
								...navButtonSx(false),
								width: "auto",
								fontSize: "0.875rem",
							}}
						>
							<Box
								component="span"
								aria-hidden="true"
								sx={{
									color: "text.disabled",
									"&:hover": { color: "primary.main" },
								}}
							>
								▸
							</Box>
							<Box component="span">{item.command}</Box>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
}
