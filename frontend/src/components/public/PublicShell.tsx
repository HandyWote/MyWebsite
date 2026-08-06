import Link from "next/link";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { getArticlePage } from "@/api/publicApi.server";
import { ArticleDetailNav } from "./ArticleDetailNav";
import { TerminalCommandBar } from "./TerminalCommandBar";
import { navButtonSx, type ShellArticle } from "./shellUtils";

const items = [
	{ label: "articles", href: "/articles" },
	{ label: "projects", href: "/projects" },
	{ label: "about", href: "/" },
];

const SHELL_SUGGESTIONS = {
	detail: ["open prev", "open next", "exit", "cd projects/", "help"],
	list: ["open latest", "cd projects/", "cd about/", "help"],
	projects: ["cd articles/", "cd about/", "help"],
	default: ["cd articles/", "cd projects/", "help"],
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
	if (activePath.startsWith("/articles")) {
		return { cwd: "~/app/articles", detail: false };
	}
	return { cwd: "~/app", detail: false };
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
		<Box
			className="screen-page"
			sx={{
				height: "var(--public-viewport-height)",
				display: "grid",
				gridTemplateRows: "minmax(0, 1fr) auto",
				border: 1,
				borderColor: "divider",
				overflow: "hidden",
				bgcolor: "background.default",
			}}
		>
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
						display: { xs: "none", md: "block" },
						minHeight: 0,
						overflow: "auto",
						p: 1.5,
						bgcolor: "background.paper",
						borderRight: 1,
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
									color: "text.disabled",
									fontFamily: "JetBrains Mono, monospace",
									fontSize: "0.75rem",
									mb: 1.25,
								}}
							>
								explorer
							</Box>
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 0.25,
								}}
							>
								{items.map((item) => {
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
					sx={{ minWidth: 0, minHeight: 0, overflow: "auto" }}
				>
					<Box
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
					<Box sx={{ p: { xs: 1, sm: 2.5 }, pl: { xs: 1, sm: 3 } }}>
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
		</Box>
	);
}
