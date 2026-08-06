"use client";

import Link from "next/link";
import { Box, Typography, type CardProps } from "@mui/material";
import type { ComponentType } from "react";
import type { ArticleSummary } from "@/api/types";
import PixelCardBase from "@/components/pixel/ui/PixelCard";
import { RevealList } from "./RevealList";

// PixelCard.jsx 无显式 props 类型，未解构的 title/subtitle/footer 被推断为必填；
// 这里按 MUI Card 的 props 重新声明，避免在 TS 调用处误报。
const PixelCard = PixelCardBase as unknown as ComponentType<CardProps>;

const CARD_HOVER_SX = {
	cursor: "pointer",
	transition: "all 0.15s ease",
	"&:hover": {
		borderColor: "primary.main",
		transform: "translateX(4px)",
	},
} as const;

// 与服务端 @/api/publicApi.server 的 formatListDate 输出一致。
// 该模块带 server-only 标记，不能在 client 组件中导入。
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

export function ArticleCards({ articles }: { articles: ArticleSummary[] }) {
	return (
		<RevealList gap={1.5} direction="left" stagger={0.08}>
			{articles.map((article) => {
				const category =
					article.category ||
					(typeof article.tags === "string"
						? article.tags
						: article.tags?.[0]) ||
					"";
				const readTime = article.read_time || "5 min read";
				return (
					<Link
						key={article.id}
						href={`/articles/${article.id}`}
						className="article-card-link"
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
					</Link>
				);
			})}
		</RevealList>
	);
}
