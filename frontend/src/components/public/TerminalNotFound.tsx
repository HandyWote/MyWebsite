"use client";

import { Box, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

const PROMPT = "guest@handywote:~ $";

const SUGGESTIONS = [
	{ command: "cd articles/", href: "/articles" },
	{ command: "cd projects/", href: "/projects" },
	{ command: "cd games/", href: "/games" },
	{ command: "cd ~", href: "/" },
];

const srOnly = {
	position: "absolute",
	width: 1,
	height: 1,
	margin: -1,
	padding: 0,
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
	border: 0,
} as const;

/** hover 语言与首页 SocialLinks 一致：▸ 浮现 + 强调蓝 + 0.15s 过渡。 */
const suggestionSx = {
	display: "flex",
	alignItems: "center",
	gap: 1,
	color: "text.secondary",
	textDecoration: "none",
	fontFamily: "JetBrains Mono, monospace",
	fontSize: "0.875rem",
	transition: "color 0.15s ease",
	"&:hover": {
		color: "primary.main",
	},
	"&:hover::before": {
		content: '"▸ "',
		color: "primary.main",
	},
} as const;

export function TerminalNotFound() {
	const pathname = usePathname();
	const requested = pathname || "/";

	return (
		<Box
			component="main"
			data-testid="terminal-not-found"
			sx={{
				minHeight: "var(--public-viewport-height, 100vh)",
				display: "grid",
				placeItems: "center",
				bgcolor: "background.default",
				px: { xs: 1.25, sm: 4 },
				py: { xs: 2, sm: 5 },
			}}
		>
			<Typography component="h1" sx={srOnly}>
				404 not found
			</Typography>
			<Box
				sx={{
					width: "min(100%, 760px)",
					display: "flex",
					flexDirection: "column",
					minHeight: { xs: 420, sm: 500 },
					border: 1,
					borderColor: "divider",
					bgcolor: "background.paper",
					p: { xs: 2, sm: 3.5 },
					overflowX: "auto",
				}}
			>
				<Box
					sx={{
						fontFamily: "JetBrains Mono, monospace",
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
						fontSize: "clamp(0.5rem, 2.6vw, 1.25rem)",
						lineHeight: 1.35,
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
						fontFamily: "JetBrains Mono, monospace",
						fontSize: "0.875rem",
						lineHeight: 2,
					}}
				>
					<Box sx={{ color: "text.secondary" }}>
						hint: requested page does not exist
					</Box>
					<Box sx={{ color: "text.secondary", mt: 1 }}>did you mean:</Box>
					<Box sx={{ display: "grid", gap: 0.5, mt: 0.5, pl: 2 }}>
						{SUGGESTIONS.map((item) => (
							<Box
								key={item.href}
								component={Link}
								href={item.href}
								sx={suggestionSx}
							>
								{item.command}
							</Box>
						))}
					</Box>
				</Box>

				<Box
					sx={{
						mt: "auto",
						pt: { xs: 3, sm: 5 },
						fontFamily: "JetBrains Mono, monospace",
						fontSize: { xs: "0.8125rem", sm: "0.875rem" },
						color: "text.primary",
						display: "flex",
						alignItems: "center",
						gap: 0.5,
						whiteSpace: "nowrap",
					}}
				>
					<Box component="span" sx={{ color: "text.secondary" }}>
						{PROMPT}
					</Box>
					<Box
						component="span"
						data-testid="terminal-cursor"
						sx={{
							display: "inline-block",
							width: "0.6em",
							height: "1.1em",
							bgcolor: "text.primary",
							"@keyframes terminal-cursor-blink": {
								"0%, 49%": { opacity: 1 },
								"50%, 100%": { opacity: 0 },
							},
							animation: "terminal-cursor-blink 1.1s steps(1) infinite",
						}}
					/>
				</Box>
			</Box>
		</Box>
	);
}
