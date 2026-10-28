import Link from "next/link";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { getArticlePage } from "@/api/publicApi.server";
import { ArticleDetailNav } from "./ArticleDetailNav";
import { ScreenFrame } from "./ScreenFrame";
import { ShellFlipProvider } from "./ShellFlipProvider";
import { TerminalCommandBar } from "./TerminalCommandBar";
import {
	navButtonSx,
	SHELL_NAV_ITEMS,
	type ShellArticle,
} from "./shellUtils";

/**
 * 各页语境的命令建议:cd 行从 SHELL_NAV_ITEMS 派生,
 * 新增导航项只需在注册表排除表中声明,不再逐组硬编码。
 */
const buildSuggestions = (
	exclude: readonly string[],
	extras: string[] = [],
): string[] => [
	...SHELL_NAV_ITEMS.filter((item) => !exclude.includes(item.label)).map(
		(item) => item.command,
	),
	...extras,
	"help",
];

const SHELL_SUGGESTIONS = {
	detail: buildSuggestions(["articles"], ["open prev", "open next", "exit"]),
	list: buildSuggestions(["articles"], ["open latest"]),
	projects: buildSuggestions(["projects"]),
	default: buildSuggestions([]),
};

const getShellState = (
	activePath: string,
): { cwd: string; detail: boolean } => {
	if (/^\/articles\/[^/]+/.test(activePath)) {
		return { cwd: "~/app/articles", detail: true };
	}
	if (activePath.startsWith("/projects")) {
		return { cwd: "~/app/projects", detail: false };
	}
	if (activePath.startsWith("/games")) {
		return { cwd: "~/app/games", detail: false };
	}
	if (activePath.startsWith("/articles")) {
		return { cwd: "~/app/articles", detail: false };
	}
	return { cwd: "~/about", detail: false };
};

async function getShellArticles(): Promise<ShellArticle[]> {
	try {
		const page = await getArticlePage(1, 100);
		const articles = page.items ?? page.articles ?? [];
		return articles.map(({ id, title }) => ({ id, title }));
	} catch {
		return [];
	}
}

export async function PublicShell({
	activePath,
	children,
}: {
	activePath: string;
	children: ReactNode;
}) {
	const [articles, shell] = await Promise.all([
		getShellArticles(),
		Promise.resolve(getShellState(activePath)),
	]);
	const idPart = activePath.split("/")[2] ?? "";
	const currentArticleId =
		shell.detail && /^\d+$/.test(idPart) ? Number(idPart) : undefined;
	const suggestions = shell.detail
		? SHELL_SUGGESTIONS.detail
		: activePath.startsWith("/projects")
			? SHELL_SUGGESTIONS.projects
			: activePath.startsWith("/articles")
				? SHELL_SUGGESTIONS.list
				: SHELL_SUGGESTIONS.default;

	return (
		<ScreenFrame>
			<ShellFlipProvider>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "180px minmax(0, 1fr)" },
					minHeight: 0,
				}}
			>
				<Box
					component="aside"
					sx={{
						display: "flex",
						flexDirection: { xs: "row", md: "column" },
						alignItems: { xs: "center", md: "stretch" },
						gap: { xs: 0.75, md: 0 },
						minHeight: 0,
						overflowX: { xs: "auto", md: "visible" },
						overflowY: { xs: "hidden", md: "auto" },
						p: { xs: 1, md: 1.5 },
						bgcolor: "background.paper",
						borderRight: { xs: 0, md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
					}}
				>
					{shell.detail ? (
						<ArticleDetailNav
							articles={articles}
							currentId={currentArticleId}
						/>
					) : (
						<>
							<Box
								sx={{
									display: { xs: "none", md: "block" },
									color: "text.disabled",
									fontFamily: "JetBrains Mono, monospace",
									fontSize: "0.75rem",
									mb: { xs: 0, md: 1.25 },
								}}
							>
								explorer
							</Box>
							<Box
								className="explorer-tree"
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 0.25,
								}}
							>
								{SHELL_NAV_ITEMS.map((item) => {
									const active =
										item.href === "/"
											? activePath === "/"
											: activePath.startsWith(item.href);
									return (
										<Link
											key={item.href}
											href={item.href}
											className="public-shell-link"
										>
											<Box sx={navButtonSx(active)}>
												<Box
													component="span"
													sx={{
														color: active ? "primary.main" : "text.disabled",
													}}
												>
													{active ? "▸" : ""}
												</Box>
												<Box component="span">{item.label}</Box>
											</Box>
										</Link>
									);
								})}
							</Box>
						</>
					)}
				</Box>
				<Box
					component="main"
					data-shell-main
					sx={{ minWidth: 0, minHeight: 0, overflow: "auto" }}
				>
					<Box
						data-shell-status
					sx={{
							minHeight: 34,
							px: 1.5,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							borderBottom: 1,
							borderColor: "divider",
							bgcolor: "background.paper",
							color: "text.disabled",
							fontFamily: "JetBrains Mono, monospace",
							fontSize: "0.75rem",
						}}
					>
						<span>{shell.cwd}/</span>
						<span>NORMAL</span>
					</Box>
					<Box data-shell-content sx={{ p: { xs: 1, sm: 2.5 }, pl: { xs: 1, sm: 3 } }}>
						{children}
					</Box>
				</Box>
			</Box>
			<TerminalCommandBar
				cwd={shell.cwd}
				commands={suggestions}
				articles={articles}
				currentArticleId={currentArticleId}
			/>
			</ShellFlipProvider>
		</ScreenFrame>
	);
}
