"use client";

import { Box, Typography } from "@mui/material";
import { getGame } from "@/games/registry";
import type { PaperGameHost } from "@/games/host";

/**
 * 游戏查看模式客户端分派（工单 #9 T10a）。
 *
 * page.tsx 是 Server Component：注册表里的 DetailView 是组件引用，不能跨
 * RSC 序列化边界传给 client 组件（Next 16 会抛 "Functions cannot be passed
 * directly to Client Components"，/games/[id] 因此 500）。本组件把解引用收
 * 敛到 client 侧——page 只传可序列化的 gameId，组件引用（DetailView /
 * GameView）从不跨边界。
 *
 * P0 无真实宿主：非桌面查看模式只做静态展示，host 传空操作 stub；真实宿
 * 主由 PublicExperience 在桌面 3D 纸面上注入（与 DrawingCanvasView 的约定
 * 一致，尺寸不依赖 host.getSize）。
 */
const STUB_HOST: PaperGameHost = {
	mount() {},
	unmount() {},
	getSize: () => ({ width: 0, height: 0 }),
};

export function GameDetailView({ gameId }: { gameId: string }) {
	const game = getGame(gameId);
	const DetailView = game?.DetailView;
	if (!DetailView) {
		return (
			<Typography
				color="text.secondary"
				sx={{
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "0.875rem",
					lineHeight: 1.7,
				}}
			>
				此游戏（{game?.name ?? gameId}）需要桌面 3D 纸面体验，请使用桌面端浏览器
				打开本站，在纸面上游玩。
			</Typography>
		);
	}
	return <DetailView host={STUB_HOST} />;
}
