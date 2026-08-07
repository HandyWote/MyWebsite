import type { ComponentType, ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { getProjects } from "@/api/publicApi.server";
import { pageMetadata } from "@/seo/site";
import { PublicShell } from "@/components/public/PublicShell";
import { RevealList } from "@/components/public/RevealList";
import PixelCardBase from "@/components/pixel/ui/PixelCard";
import { PixelChip } from "@/components/pixel/ui/PixelChip";

// PixelCard.jsx 无显式 props 类型，未解构的 title/subtitle/footer 被推断为必填；
// 这里按本项目实际用法（外链卡片）声明 props，避免在 TS 调用处误报。
type PixelCardLinkProps = {
	component: "a";
	href: string;
	target?: string;
	rel?: string;
	sx?: SxProps<Theme>;
	children?: ReactNode;
};

const PixelCard = PixelCardBase as unknown as ComponentType<PixelCardLinkProps>;

export const metadata: Metadata = pageMetadata({
	title: "Projects",
	description: "HandyWote 的开源项目与代码仓库。",
	path: "/projects",
});

export default async function ProjectsPage() {
	await connection();
	const { config, projects, error } = await getProjects();
	return (
		<PublicShell activePath="/projects">
			<Typography
				sx={{
					color: "text.secondary",
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "0.8125rem",
					lineHeight: 1.5,
				}}
			>
				$ ls -la ./projects/
			</Typography>
			<Typography
				sx={{
					color: error ? "error.main" : "success.main",
					fontFamily: "JetBrains Mono, monospace",
					fontSize: "0.8125rem",
					lineHeight: 1.5,
					mb: 1.5,
				}}
			>
				{error ? `error: ${error}` : `found ${projects.length} repositories`}
			</Typography>
			<Box sx={{ borderBottom: 1, borderColor: "#21262d", mb: 1.5 }} />
			{!error && projects.length === 0 && (
				<Typography color="text.secondary">
					{String(config.empty_text)}
				</Typography>
			)}
			<RevealList gap={0.75} direction="up" stagger={0.025} maxDelay={0.35}>
				{projects.map((project) => (
					<PixelCard
						key={project.id}
						component="a"
						href={project.url}
						target="_blank"
						rel="noreferrer"
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
								gap: 1,
								alignItems: "center",
								minWidth: 0,
							}}
						>
							<Typography
								component="h2"
								sx={{
									fontFamily: "JetBrains Mono, monospace",
									fontWeight: 600,
									fontSize: { xs: "1rem", sm: "1.125rem" },
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{project.name}
							</Typography>
							<ExternalLink size={14} />
						</Box>
						<Typography
							color="text.secondary"
							sx={{
								my: 1,
								fontSize: "0.875rem",
								lineHeight: 1.6,
								display: "-webkit-box",
								WebkitLineClamp: 2,
								WebkitBoxOrient: "vertical",
								overflow: "hidden",
							}}
						>
							{project.description}
						</Typography>
						<Box
							sx={{
								display: "flex",
								gap: 1,
								flexWrap: "wrap",
								alignItems: "center",
							}}
						>
							{project.tags.map((tag) => (
								<PixelChip key={tag} label={tag} />
							))}
							<Typography
								component="time"
								sx={{
									ml: { sm: "auto" },
									width: { xs: "100%", sm: "auto" },
									whiteSpace: { xs: "normal", sm: "nowrap" },
									color: "text.secondary",
									fontFamily: "JetBrains Mono, monospace",
									fontSize: "0.75rem",
								}}
							>
								★ {project.stars} · ⑂ {project.forks} · updated{" "}
								{project.updatedAt}
							</Typography>
						</Box>
					</PixelCard>
				))}
			</RevealList>
		</PublicShell>
	);
}
