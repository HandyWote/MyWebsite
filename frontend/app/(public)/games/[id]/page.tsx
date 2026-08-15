import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { getGame } from "@/games/registry";
import { DESKTOP_3D_MEDIA } from "@/games/media";
import type { PaperGameHost } from "@/games/host";
import { pageMetadata } from "@/seo/site";
import { PublicShell } from "@/components/public/PublicShell";

/**
 * P0 无真实宿主：非桌面查看模式（DetailView）只做静态展示，host 传
 * 空操作 stub；真实宿主由 PublicExperience 在桌面 3D 纸面上注入。
 */
const STUB_HOST: PaperGameHost = {
	mount() {},
	unmount() {},
	getSize: () => ({ width: 0, height: 0 }),
};

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

	const DetailView = game.DetailView;
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
				{/* 查看模式块：非桌面端渲染（data-game-detail-view） */}
				<Box component="section" data-game-detail-view>
					{DetailView ? (
						<DetailView host={STUB_HOST} />
					) : (
						<Typography
							color="text.secondary"
							sx={{
								fontFamily: "JetBrains Mono, monospace",
								fontSize: "0.875rem",
								lineHeight: 1.7,
							}}
						>
							此游戏（{game.name}）需要桌面 3D 纸面体验，请使用桌面端浏览器
							打开本站，在纸面上游玩。
						</Typography>
					)}
				</Box>
			</Box>
		</PublicShell>
	);
}
