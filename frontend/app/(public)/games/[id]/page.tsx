import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { getGame } from "@/games/registry";
import { GameDetailView } from "@/games/GameDetailView";
import { DESKTOP_3D_MEDIA } from "@/games/media";
import { pageMetadata } from "@/seo/site";
import { PublicShell } from "@/components/public/PublicShell";

type GamePageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
	params,
}: GamePageProps): Promise<Metadata> {
	const { id } = await params;
	const game = getGame(id);
	if (!game) notFound();
	return pageMetadata({
		title: game.name,
		description: game.description,
		path: `/games/${id}`,
	});
}

export default async function GamePage({ params }: GamePageProps) {
	const { id } = await params;
	const game = getGame(id);
	if (!game) notFound();

	return (
		<PublicShell activePath={`/games/${id}`}>
			{/* 可见性切换的媒体查询与 src/games/media.ts 的 DESKTOP_3D_MEDIA
			    保持一致（index.css games 段落）；该属性供测试断言同步。 */}
			<Box data-games-desktop-media={DESKTOP_3D_MEDIA}>
				{/* 说明块：桌面 monitor 内显示（data-game-description） */}
				<Box component="section" data-game-description>
					<Typography
						sx={{
							color: "text.secondary",
							fontFamily: "JetBrains Mono, monospace",
							fontSize: "0.8125rem",
							lineHeight: 1.5,
							mb: 1.5,
						}}
					>
						$ cat games/{game.id}.md
					</Typography>
					<Typography
						component="h1"
						sx={{
							fontFamily: "JetBrains Mono, monospace",
							fontWeight: 600,
							fontSize: { xs: "1.25rem", sm: "1.5rem" },
							mb: 1.5,
							overflowWrap: "anywhere",
						}}
					>
						{game.name}
						<Box
							component="span"
							className="cursor-blink"
							sx={{
								display: "inline-block",
								width: "0.55em",
								height: "1.2em",
								bgcolor: "primary.main",
								ml: "0.15em",
							}}
						/>
					</Typography>
					<Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
						{game.description}
					</Typography>
				</Box>
				{/* 查看模式块：非桌面端渲染（data-game-detail-view）。
				    组件引用（DetailView）不能跨 RSC 边界，由 client 分派
				    组件从注册表解引用（工单 #9 T10a）。 */}
				<Box component="section" data-game-detail-view>
					<GameDetailView gameId={game.id} />
				</Box>
			</Box>
		</PublicShell>
	);
}
