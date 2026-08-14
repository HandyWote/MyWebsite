import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Button, Typography, type CardProps } from "@mui/material";
import type { ComponentType } from "react";
import { CalendarDays, Eye } from "lucide-react";
import { formatServerDate } from "@/api/publicApi.server";
import { ServerApiError } from "@/api/server";
import { normalizeTags } from "@/utils/normalizeTags";
import { ArticleActions } from "@/components/public/ArticleActions";
import { ArticleExitButton } from "@/components/public/ArticleExitButton";
import { CommentSectionClient } from "@/components/public/CommentSectionClient";
import { MarkdownContent } from "@/components/public/MarkdownContent";
import { PdfViewerClient } from "@/components/public/PdfViewerClient";
import PixelChip from "@/components/pixel/ui/PixelChip";
import PixelCardBase from "@/components/pixel/ui/PixelCard";
import { PublicShell } from "@/components/public/PublicShell";
import { getArticleForPage } from "@/seo/data.server";
import {
	articleJsonLd,
	articleMetadata,
	getArticlePdfUrl,
	serializeJsonLd,
} from "@/seo/site";

type PixelCardProps = CardProps & { accentLine?: boolean };

const PixelCard = PixelCardBase as unknown as ComponentType<PixelCardProps>;

export const dynamicParams = true;
export const revalidate = 86_400;

export function generateStaticParams(): { id: string }[] {
	return [];
}

type ArticlePageProps = { params: Promise<{ id: string }> };

async function loadArticle(id: string) {
	try {
		return await getArticleForPage(id);
	} catch (error) {
		if (error instanceof ServerApiError && error.status === 404) notFound();
		throw error;
	}
}

export async function generateMetadata({
	params,
}: ArticlePageProps): Promise<Metadata> {
	const { id } = await params;
	return articleMetadata(await loadArticle(id));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
	const { id } = await params;
	const article = await loadArticle(id);
	const tags = normalizeTags(article.tags ?? []);
	const pdfUrl = getArticlePdfUrl(article);
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: serializeJsonLd(articleJsonLd(article)),
				}}
			/>
			<PublicShell activePath={`/articles/${id}`}>
				<Typography
					sx={{
						color: "text.secondary",
						fontFamily: "JetBrains Mono, monospace",
						mb: 1.5,
					}}
				>
					cat article/{id}.md
				</Typography>
				<Box
					sx={{
						border: 1,
						borderStyle: "dashed",
						borderColor: "divider",
						p: { xs: 1.25, sm: 3 },
					}}
				>
					<ArticleExitButton />
					<PixelCard component="article" accentLine sx={{ mt: 2 }}>
						<Typography
							component="h1"
							variant="h2"
							sx={{ mb: 2, overflowWrap: "anywhere" }}
						>
							{article.title}
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
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
							{article.category && <PixelChip label={article.category} />}
							{tags.map((tag) => (
								<PixelChip key={tag} label={tag} />
							))}
						</Box>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								flexWrap: "wrap",
								gap: 2,
								mb: 3,
								color: "text.secondary",
							}}
						>
							<Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
								<CalendarDays size={16} />
								<time dateTime={article.created_at}>
									{formatServerDate(article.created_at)}
								</time>
							</Box>
							{typeof article.views === "number" && (
								<Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
									<Eye size={16} />
									{article.views} 次阅读
								</Box>
							)}
							<Box sx={{ ml: { sm: "auto" } }}>
								<ArticleActions
									title={article.title}
									summary={article.summary}
								/>
							</Box>
						</Box>
						{article.summary && (
							<Typography color="text.secondary" sx={{ mb: 3 }}>
								{article.summary}
							</Typography>
						)}
						{article.content_type === "pdf" && article.pdf_filename ? (
							<Box component="section" aria-labelledby="pdf-document-heading">
								<Typography
									id="pdf-document-heading"
									component="h2"
									variant="h5"
									sx={{ mb: 1 }}
								>
									PDF document
								</Typography>
								<Button
									component="a"
									href={pdfUrl}
									target="_blank"
									rel="noreferrer"
									variant="outlined"
									sx={{ mb: 2 }}
								>
									Open PDF
								</Button>
								<PdfViewerClient filename={article.pdf_filename} url={pdfUrl} />
							</Box>
						) : (
							<MarkdownContent content={article.content ?? ""} />
						)}
					</PixelCard>
					<Box sx={{ mt: 3 }}>
						<CommentSectionClient articleId={article.id} />
					</Box>
				</Box>
			</PublicShell>
		</>
	);
}
