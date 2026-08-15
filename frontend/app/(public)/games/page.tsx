import type { ComponentType, ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { GAME_REGISTRY } from "@/games/registry";
import { pageMetadata } from "@/seo/site";
import { PublicShell } from "@/components/public/PublicShell";
import { RevealList } from "@/components/public/RevealList";
import PixelCardBase from "@/components/pixel/ui/PixelCard";

// PixelCard.jsx 无显式 props 类型，未解构的 title/subtitle/footer 被推断为必填；
// 这里按本项目实际用法（内链卡片）声明 props，避免在 TS 调用处误报。
type PixelCardLinkProps = {
	component: "a";
	href: string;
	sx?: SxProps<Theme>;
	children?: ReactNode;
	/** e2e 探针定位：data-game-card={game.id}。 */
	"data-game-card"?: string;
};

const PixelCard = PixelCardBase as unknown as ComponentType<PixelCardLinkProps>;

export const metadata: Metadata = pageMetadata({
	title: "Games",
	description: "HandyWote 的纸面小游戏大厅：在桌面 3D 纸面上游玩的交互小游戏。",
	path: "/games",
});

export default async function GamesPage() {
	await connection();
	const games = GAME_REGISTRY;
	return (
		<PublicShell activePath="/games">
			<Typography
				sx={{
					color: "text.secondary",
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "0.8125rem",
					lineHeight: 1.5,
				}}
			>
				$ ls ./games/
			</Typography>
			<Typography
				sx={{
					color: games.length > 0 ? "success.main" : "warning.main",
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "0.8125rem",
					lineHeight: 1.5,
					mb: 1.5,
				}}
			>
				found {games.length} game{games.length === 1 ? "" : "s"}
			</Typography>
			<Box sx={{ borderBottom: 1, borderColor: "#21262d", mb: 1.5 }} />
			{games.length === 0 ? (
				<Box data-games-empty>
					<Typography color="text.secondary">
						还没有游戏入驻，纸堆空空如也——稍后再来看看吧。
					</Typography>
				</Box>
			) : (
				<RevealList gap={0.75} direction="up" stagger={0.025} maxDelay={0.35}>
					{games.map((game) => (
						<PixelCard
							key={game.id}
							component="a"
							href={`/games/${game.id}`}
							data-game-card={game.id}
							sx={{
								display: "block",
								color: "inherit",
								textDecoration: "none",
								transition: "all 0.15s ease",
								"&:hover": { borderColor: "primary.main" },
							}}
						>
							<Box
								sx={{
									display: "flex",
									gap: 1.5,
									alignItems: "flex-start",
									minWidth: 0,
								}}
							>
								<Box
									component="img"
									src={game.preview}
									alt={`${game.name} preview`}
									sx={{
										width: { xs: 96, sm: 128 },
										aspectRatio: "16 / 10",
										objectFit: "cover",
										flexShrink: 0,
										border: 1,
										borderColor: "divider",
										bgcolor: "background.default",
									}}
								/>
								<Box sx={{ minWidth: 0 }}>
									<Typography
										component="h2"
										sx={{
											fontFamily: "JetBrains Mono, monospace",
											fontWeight: 600,
											fontSize: { xs: "1rem", sm: "1.125rem" },
										}}
									>
										{game.name}
									</Typography>
									<Typography
										color="text.secondary"
										sx={{
											mt: 0.75,
											fontSize: "0.875rem",
											lineHeight: 1.6,
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
											overflow: "hidden",
										}}
									>
										{game.description}
									</Typography>
								</Box>
							</Box>
						</PixelCard>
					))}
				</RevealList>
			)}
		</PublicShell>
	);
}
