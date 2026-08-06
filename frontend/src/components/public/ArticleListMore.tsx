"use client";

import Link from "next/link";
import { Box, Button, Typography, type CardProps } from "@mui/material";
import { useState, type ComponentType } from "react";
import { browserApi } from "@/api/browser";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ArticlePage, ArticleSummary } from "@/api/types";
import PixelCardBase from "@/components/pixel/ui/PixelCard";

// PixelCard.jsx 无显式 props 类型，未解构的 title/subtitle/footer 被推断为必填；
// 这里按 MUI Card 的 props 重新声明，避免在 TS 调用处误报。
const PixelCard = PixelCardBase as unknown as ComponentType<CardProps>;

// 与服务端 @/api/publicApi.server 的 formatListDate 输出一致
// （该模块带 server-only 标记，不能在 client 组件中导入，故本地内联同构实现）。
function formatListDate(value?: string): string {
	if (!value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(parsed);
}

const CARD_HOVER_SX = {
	cursor: "pointer",
	transition: "all 0.15s ease",
	"&:hover": { borderColor: "primary.main", transform: "translateX(4px)" },
} as const;

export function ArticleListMore({
	initialCount,
	total,
	pageSize = 10,
}: {
	initialCount: number;
	total: number;
	pageSize?: number;
}) {
	const [articles, setArticles] = useState<ArticleSummary[]>([]);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const hasMore = initialCount + articles.length < total;
	const loadMore = async () => {
		setLoading(true);
		setError("");
		try {
			const nextPage = page + 1;
			const payload = await browserApi.get<ArticlePage>(
				`${API_ENDPOINTS.PUBLIC.ARTICLES}?page=${nextPage}&per_page=${pageSize}`,
			);
			const next = payload.items ?? payload.articles ?? [];
			setArticles((current) => [...current, ...next]);
			setPage(nextPage);
		} catch (reason) {
			setError(
				reason instanceof Error ? reason.message : "Unable to load articles",
			);
		} finally {
			setLoading(false);
		}
	};
	return (
		<Box sx={{ mt: 1.5 }}>
			{articles.map((article) => {
				const category =
					article.category ||
					(typeof article.tags === "string"
						? article.tags
						: article.tags?.[0]) ||
					"";
				const readTime = article.read_time || "5 min read";
				return (
					<Box
						key={article.id}
						component={Link}
						href={`/articles/${article.id}`}
						className="article-card-link"
						sx={{
							display: "block",
							mb: 1.5,
							color: "inherit",
							textDecoration: "none",
						}}
					>
						<PixelCard sx={CARD_HOVER_SX}>
							<Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
								<Typography
									component="time"
									dateTime={article.created_at}
									sx={{
										color: "text.disabled",
										fontFamily: "JetBrains Mono, monospace",
										fontSize: "0.875rem",
										minWidth: 60,
									}}
								>
									{formatListDate(article.created_at)}
								</Typography>
								<Box sx={{ minWidth: 0, flex: 1 }}>
									<Typography
										component="h2"
										sx={{
											color: "text.primary",
											fontFamily: "JetBrains Mono, monospace",
											fontSize: "1rem",
											fontWeight: 500,
											overflowWrap: "anywhere",
										}}
									>
										▸ {article.title}
									</Typography>
									<Typography
										component="div"
										sx={{
											mt: 0.5,
											pl: 3,
											color: "text.disabled",
											fontFamily: "JetBrains Mono, monospace",
											fontSize: "0.75rem",
										}}
									>
										{category}
										{readTime ? ` · ${readTime}` : ""}
									</Typography>
								</Box>
							</Box>
						</PixelCard>
					</Box>
				);
			})}
			{error && (
				<Typography color="error" sx={{ mb: 1 }}>
					{error}
				</Typography>
			)}
			{hasMore && (
				<Button variant="outlined" onClick={loadMore} disabled={loading}>
					{loading ? "Loading..." : "Load more"}
				</Button>
			)}
		</Box>
	);
}
