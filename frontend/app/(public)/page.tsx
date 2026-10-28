import type { Metadata } from "next";
import { connection } from "next/server";
import { Box, Typography } from "@mui/material";
import { getProfileForPage } from "@/seo/data.server";
import { pageMetadata, SITE_DESCRIPTION, SITE_TITLE } from "@/seo/site";
import { renderWebsiteJsonLd } from "@/seo/jsonld";
import { PublicShell } from "@/components/public/PublicShell";
import Education from "@/components/sidebar/Education";
import GitHubActivity from "@/components/sidebar/GitHubActivity";
import SocialLinks from "@/components/sidebar/SocialLinks";
import TechStack from "@/components/sidebar/TechStack";
import { normalizeGitHubUsername } from "@/utils/github";

export async function generateMetadata(): Promise<Metadata> {
	const { home, avatarUrl } = await getProfileForPage();
	return pageMetadata({
		title: SITE_TITLE,
		absoluteTitle: true,
		description: String(home.subtitle || SITE_DESCRIPTION),
		path: "/",
		image: avatarUrl,
	});
}

export default async function HomePage() {
	await connection();
	const { home, sidebar, avatarUrl } = await getProfileForPage();
	const socialLinks = sidebar.social_links ?? [];
	const education = sidebar.education ?? [];
	const techStack = sidebar.tech_stack ?? [];
	const githubUsername = normalizeGitHubUsername(home.github_calendar_url);

	return (
		<>
			{renderWebsiteJsonLd({ home, avatarUrl })}
			<PublicShell activePath="/">
				<Box sx={{ maxWidth: 1080, minWidth: 0 }}>
					{/* 与 /projects、/games 同一句式:$ 后跟命令,下面才是结果 */}
					<Typography
						sx={{
							color: "text.secondary",
							fontFamily: "JetBrains Mono, monospace",
							fontSize: "0.875rem",
							mb: 2.5,
						}}
					>
						$ cat about.md
					</Typography>

					{/* identity:头像 + 名字 + 一句自述 */}
					<Box
						sx={{
							display: "flex",
							gap: { xs: 2, sm: 3 },
							alignItems: "flex-start",
							mb: { xs: 3, sm: 4.5 },
						}}
					>
						<Box
							component="img"
							src={avatarUrl}
							alt="avatar"
							width={72}
							height={72}
							sx={{
								flex: "none",
								width: { xs: 56, sm: 72 },
								height: { xs: 56, sm: 72 },
								border: 1,
								borderColor: "divider",
								backgroundColor: "background.paper",
							}}
						/>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								component="h1"
								sx={{
									color: "text.primary",
									fontFamily: "JetBrains Mono, monospace",
									fontWeight: 700,
									fontSize: { xs: "1.625rem", sm: "2.125rem" },
									lineHeight: 1.1,
									letterSpacing: "-0.02em",
								}}
							>
								{String(home.title)}
							</Typography>
							<Typography
								component="p"
								sx={{
									mt: 1,
									color: "text.secondary",
									fontFamily: "JetBrains Mono, monospace",
									fontSize: "0.9375rem",
								}}
							>
								$ {String(home.subtitle)}
							</Typography>
						</Box>
					</Box>

					{/* 资料:单列,从上到下 */}
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							"& > *": { minWidth: 0 },
						}}
					>
						<Education items={education} />
						<TechStack items={techStack} />
						<SocialLinks links={socialLinks} />
						<GitHubActivity username={githubUsername} compact={false} />
					</Box>
				</Box>
			</PublicShell>
		</>
	);
}
