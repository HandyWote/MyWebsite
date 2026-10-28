import type { Metadata } from "next";
import { connection } from "next/server";
import { Box, Typography } from "@mui/material";
import { getArticlePage, getArticlesPageConfig } from "@/api/publicApi.server";
import { pageMetadata } from "@/seo/site";
import { ArticleListMore } from "@/components/public/ArticleListMore";
import { ArticlePagerSr } from "@/components/public/ArticlePagerSr";
import { PublicShell } from "@/components/public/PublicShell";

const PAGE_SIZE = 10;
const PAGE_DESCRIPTION = "HandyWote 的文章与技术分享。";

type ArticlesPageSearchParams = Record<
	string,
	string | string[] | undefined
>;

type ArticlesPageProps = {
	searchParams: Promise<ArticlesPageSearchParams | undefined>;
};

/** `?page=N` 解析：非法/缺失一律回落到第 1 页，避免出现 page=0/-1/NaN。 */
function parsePageNumber(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value;
	const parsed = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** 第 1 页沿用 `/articles`（不带查询串），第 N 页 canonical 指向自身。 */
function articlesPagePath(page: number): string {
	return page > 1 ? `/articles?page=${page}` : "/articles";
}

async function readPage(
	searchParams: ArticlesPageProps["searchParams"],
): Promise<number> {
	return parsePageNumber((await searchParams)?.page);
}

export async function generateMetadata({
	searchParams,
}: ArticlesPageProps): Promise<Metadata> {
	const page = await readPage(searchParams);
	return pageMetadata({
		title: page > 1 ? `Articles · page ${page}` : "Articles",
		description: PAGE_DESCRIPTION,
		path: articlesPagePath(page),
	});
}

async function getInitialArticlePage(page: number) {
	try {
		return { value: await getArticlePage(page, PAGE_SIZE), error: "" };
	} catch (error) {
		return {
			value: null,
			error: error instanceof Error ? error.message : "Unable to load articles",
		};
	}
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
	await connection();
	const page = await readPage(searchParams);
	const [config, result] = await Promise.all([
		getArticlesPageConfig(),
		getInitialArticlePage(page),
	]);
	const articles = result.value?.items ?? result.value?.articles ?? [];
	const total = Number(result.value?.total) || articles.length;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	return (
		<PublicShell activePath="/articles">
			<Box sx={{ mb: 3 }}>
				{config.title && (
					<Typography
						component="h1"
						sx={{
							color: "text.primary",
							fontFamily: "JetBrains Mono, monospace",
							fontSize: "1rem",
							mb: 1,
						}}
					>
						{String(config.title)}
					</Typography>
				)}
				{config.subtitle && (
					<Typography
						sx={{
							color: "text.secondary",
							fontFamily: "JetBrains Mono, monospace",
							mb: 1,
						}}
					>
						{String(config.subtitle)}
					</Typography>
				)}
				<Typography
					sx={{
						color: "text.secondary",
						fontFamily: "JetBrains Mono, monospace",
					}}
				>
					$ ls -la ./articles/
				</Typography>
				<Typography
					sx={{
						color: result.error ? "error.main" : "success.main",
						fontFamily: "JetBrains Mono, monospace",
						mb: 2,
					}}
				>
					{result.error ? `error: ${result.error}` : `found ${total} articles`}
				</Typography>
				<Box sx={{ borderBottom: 1, borderColor: "divider" }} />
			</Box>
			{articles.length > 0 ? (
				<Box sx={{ position: "relative" }}>
					<ArticleListMore
						initialArticles={articles}
						initialPage={page}
						total={total}
						pageSize={PAGE_SIZE}
					/>
					<ArticlePagerSr page={page} totalPages={totalPages} />
				</Box>
			) : (
				!result.error && (
					<Typography
						sx={{
							color: "text.secondary",
							fontFamily: "JetBrains Mono, monospace",
						}}
					>
						{String(config.empty_text)}
					</Typography>
				)
			)}
		</PublicShell>
	);
}
