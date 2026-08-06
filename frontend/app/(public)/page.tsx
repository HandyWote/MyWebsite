import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Box, Typography } from "@mui/material";
import { getProfileForPage } from "@/seo/data.server";
import { pageMetadata, SITE_DESCRIPTION } from "@/seo/site";
import { HomeEnterBoundary } from "@/components/public/HomeEnterBoundary";
import { TerminalCommandBar } from "@/components/public/TerminalCommandBar";
import Education from "@/components/sidebar/Education";
import GitHubActivity from "@/components/sidebar/GitHubActivity";
import SocialLinks from "@/components/sidebar/SocialLinks";
import TechStack from "@/components/sidebar/TechStack";
import { normalizeGitHubUsername } from "@/utils/github";

type SocialLink = { label?: string; href?: string; value?: string };
type Education = { school?: string; degree?: string; period?: string };
type Tech = { name?: string; label?: string };

export async function generateMetadata(): Promise<Metadata> {
	const { home, avatarUrl } = await getProfileForPage();
	return pageMetadata({
		title: String(home.title || "HandyWote"),
		description: String(home.subtitle || SITE_DESCRIPTION),
		path: "/",
		image: avatarUrl,
	});
}

export default async function HomePage() {
	await connection();
	const { home, sidebar, avatarUrl } = await getProfileForPage();
	const socialLinks = (sidebar.social_links as SocialLink[] | undefined) ?? [];
	const education = (sidebar.education as Education[] | undefined) ?? [];
	const techStack = (sidebar.tech_stack as Tech[] | undefined) ?? [];
	const githubUsername = normalizeGitHubUsername(home.github_calendar_url);
	return (
		<HomeEnterBoundary>
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
						overflow: "auto",
						display: "flex",
						alignItems: { xs: "flex-start", md: "center" },
						justifyContent: "center",
						px: { xs: 1.25, sm: 4 },
						py: { xs: 2, sm: 5 },
					}}
				>
					<Box sx={{ width: "min(100%, 820px)", textAlign: "center" }}>
						<Typography
							component="div"
							sx={{
								color: "text.disabled",
								fontFamily: "JetBrains Mono, monospace",
								fontSize: "0.75rem",
								mb: 2,
							}}
						>
							~/intro.md - double click to enter articles
						</Typography>
						<Image
							src={avatarUrl}
							alt="avatar"
							width={84}
							height={84}
							priority
							className="home-avatar"
							style={{
								width: "clamp(64px, 20vw, 84px)",
								height: "clamp(64px, 20vw, 84px)",
							}}
						/>
						<Typography
							component="h1"
							sx={{
								mt: 2,
								mb: 1,
								color: "text.primary",
								fontFamily: "JetBrains Mono, monospace",
								fontSize: { xs: "1.875rem", sm: "2.5rem" },
								fontWeight: 700,
							}}
						>
							{String(home.title)}
						</Typography>
						<Typography
							component="p"
							sx={{
								color: "text.secondary",
								fontFamily: "JetBrains Mono, monospace",
								mb: 2,
							}}
						>
							$ {String(home.subtitle)}
							<Box
								component="span"
								className="cursor-blink"
								sx={{
									display: "inline-block",
									width: 8,
									height: 16,
									bgcolor: "primary.main",
									ml: 0.5,
								}}
							/>
						</Typography>
						<Box
							component="nav"
							aria-label="Public pages"
							sx={{
								display: "flex",
								justifyContent: "center",
								gap: 2,
								mb: 3,
								fontFamily: "JetBrains Mono, monospace",
								fontSize: "0.875rem",
							}}
						>
							<Link href="/articles">articles/</Link>
							<Link href="/projects">projects/</Link>
						</Box>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: "1fr",
								gap: { xs: 1, sm: 1.75 },
								textAlign: "center",
								justifyItems: "center",
								"& > *": {
									mb: "0 !important",
									width: "100%",
									maxWidth: "100%",
									minWidth: 0,
								},
								"& > * > div:first-of-type": {
									justifyContent: "center",
									fontSize: "0.75rem",
									color: "text.muted",
									"&::first-letter": {
										letterSpacing: 0,
									},
									"&::before": {
										content: '""',
									},
									"&::after": {
										display: "none",
									},
								},
								"& > * > div:nth-of-type(2)": {
									justifyContent: "center",
									alignItems: "center",
								},
								"& a": {
									justifyContent: "center",
								},
							}}
						>
							<SocialLinks links={socialLinks as never[]} />
							<Education items={education as never[]} />
							<TechStack items={techStack as never[]} />
							<GitHubActivity username={githubUsername} compact={false} />
						</Box>
						<Typography
							sx={{
								mt: { xs: 1.75, sm: 2.5 },
								fontFamily: "JetBrains Mono, monospace",
								color: "text.muted",
								fontSize: "0.75rem",
							}}
						>
							Double click anywhere, type a command, or click a hint below.
						</Typography>
					</Box>
				</Box>
				<TerminalCommandBar
					cwd="~/app"
					commands={["cd articles/", "cd projects/", "help"]}
				/>
			</Box>
		</HomeEnterBoundary>
	);
}
