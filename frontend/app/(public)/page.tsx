import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Box, Typography } from "@mui/material";
import { getProfileForPage } from "@/seo/data.server";
import { pageMetadata, SITE_DESCRIPTION } from "@/seo/site";
import { HomeEnterBoundary } from "@/components/public/HomeEnterBoundary";
import { TerminalCommandBar } from "@/components/public/TerminalCommandBar";
import GitHubActivity from "@/components/sidebar/GitHubActivity";
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
				sx={{
					height: "calc(100dvh - 24px)",
					display: "grid",
					gridTemplateRows: "minmax(0, 1fr) auto",
					border: 1,
					borderColor: "divider",
					overflow: "hidden",
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
								gap: 1.5,
								color: "text.secondary",
								fontFamily: "JetBrains Mono, monospace",
								fontSize: "0.8125rem",
							}}
						>
							{socialLinks.length > 0 && (
								<Box>
									{socialLinks.map((item, index) => (
										<Link
											href={item.href || "#"}
											key={`${item.label}-${index}`}
											className="home-social-link"
										>
											{item.label || item.value}
										</Link>
									))}
								</Box>
							)}
							{education.length > 0 && (
								<Box>
									{education.map((item, index) => (
										<Box
											component="span"
											key={`${item.school}-${index}`}
											sx={{ mx: 1 }}
										>
											{[item.school, item.degree, item.period]
												.filter(Boolean)
												.join(" / ")}
										</Box>
									))}
								</Box>
							)}
							{techStack.length > 0 && (
								<Box>
									{techStack.map((item, index) => (
										<Box
											component="span"
											key={`${item.name}-${index}`}
											sx={{ mx: 0.75 }}
										>
											{item.name || item.label}
										</Box>
									))}
								</Box>
							)}
							<GitHubActivity username={githubUsername} compact={false} />
						</Box>
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
