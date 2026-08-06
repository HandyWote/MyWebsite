"use client";

import { Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { navButtonSx, type ShellArticle } from "./shellUtils";

export function ArticleDetailNav({
	articles = [],
	currentId,
	loading = false,
}: {
	articles?: ShellArticle[];
	currentId?: number | string;
	loading?: boolean;
}) {
	const router = useRouter();

	return (
		<Box sx={{ p: 1.5 }}>
			<Typography
				component="div"
				sx={{
					fontFamily: "JetBrains Mono, monospace",
					color: "text.disabled",
					fontSize: "0.75rem",
					mb: 1.25,
				}}
			>
				articles
			</Typography>

			{loading ? (
				<Typography
					sx={{
						fontFamily: "JetBrains Mono, monospace",
						color: "text.disabled",
						fontSize: "0.75rem",
					}}
				>
					loading...
				</Typography>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
					{articles.map((article) => {
						const active = String(article.id) === String(currentId);
						return (
							<Box
								component="button"
								type="button"
								key={article.id}
								onClick={() => router.push(`/articles/${article.id}`)}
								data-active={active ? "true" : "false"}
								sx={navButtonSx(active, { fontSize: "0.75rem" })}
							>
								<Box
									component="span"
									sx={{ color: active ? "primary.main" : "text.disabled" }}
								>
									{active ? "▸" : ""}
								</Box>
								<Box
									component="span"
									sx={{
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{article.title}
								</Box>
							</Box>
						);
					})}
				</Box>
			)}
		</Box>
	);
}
