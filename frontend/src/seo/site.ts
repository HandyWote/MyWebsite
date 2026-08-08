import type { Metadata } from "next";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { Article } from "@/api/types";
import { normalizeTags } from "@/utils/normalizeTags";

export const SITE_NAME = "HandyWote";
export const SITE_TITLE = "HandyWote ｜ Unself";
export const SITE_DESCRIPTION = "HandyWote 的文章、项目与技术分享。";
export const SITE_AUTHOR = "HandyWote";

const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
	const configured = process.env.PUBLIC_SITE_URL?.trim() || LOCAL_SITE_URL;
	try {
		const url = new URL(configured);
		if (url.protocol !== "http:" && url.protocol !== "https:")
			throw new Error("unsupported protocol");
		url.pathname = "/";
		url.search = "";
		url.hash = "";
		return url;
	} catch {
		return new URL(LOCAL_SITE_URL);
	}
}

export function absoluteSiteUrl(path: string): string {
	if (!path) return "";
	try {
		const url = new URL(path, getSiteUrl());
		return url.protocol === "http:" || url.protocol === "https:"
			? url.toString()
			: "";
	} catch {
		return "";
	}
}

export function summarizeArticle(
	article: Pick<Article, "summary" | "content">,
): string {
	const summary = article.summary?.trim();
	if (summary) return summary.slice(0, 160);

	const plainText = (article.content ?? "")
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/<[^>]*>/g, " ")
		.replace(/[#>*_~|-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return plainText.slice(0, 160) || SITE_DESCRIPTION;
}

export function getArticleCoverUrl(
	article: Pick<Article, "cover" | "cover_url">,
): string {
	return absoluteSiteUrl(article.cover_url || article.cover || "");
}

export function getArticlePdfUrl(
	article: Pick<Article, "pdf_filename" | "pdf_url">,
): string {
	const pdfPath =
		article.pdf_url ||
		(article.pdf_filename
			? API_ENDPOINTS.PUBLIC.ARTICLE_PDF(article.pdf_filename)
			: "");
	return absoluteSiteUrl(pdfPath);
}

export function articleMetadata(article: Article): Metadata {
	const canonical = absoluteSiteUrl(`/articles/${article.id}`);
	const description = summarizeArticle(article);
	const image = getArticleCoverUrl(article);
	const images = image ? [{ url: image, alt: article.title }] : undefined;

	return {
		title: article.title,
		description,
		alternates: { canonical },
		keywords: normalizeTags(article.tags ?? []),
		openGraph: {
			type: "article",
			url: canonical,
			siteName: SITE_NAME,
			locale: "zh_CN",
			title: article.title,
			description,
			images,
			publishedTime: article.created_at,
			modifiedTime: article.updated_at,
			tags: normalizeTags(article.tags ?? []),
		},
		twitter: {
			card: image ? "summary_large_image" : "summary",
			title: article.title,
			description,
			images: image ? [image] : undefined,
		},
	};
}

export function articleJsonLd(article: Article) {
	const canonical = absoluteSiteUrl(`/articles/${article.id}`);
	const image = getArticleCoverUrl(article);
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: article.title,
		description: summarizeArticle(article),
		...(image ? { image: [image] } : {}),
		author: { "@type": "Person", name: SITE_AUTHOR },
		publisher: { "@type": "Person", name: SITE_AUTHOR },
		datePublished: article.created_at,
		dateModified: article.updated_at || article.created_at,
		mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
		articleSection: article.category || undefined,
		keywords: normalizeTags(article.tags ?? []),
		inLanguage: "zh-CN",
	};
}

export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}

export function pageMetadata({
	title,
	absoluteTitle = false,
	description,
	path,
	image = "/avatar.webp",
}: {
	title: string;
	absoluteTitle?: boolean;
	description: string;
	path: string;
	image?: string;
}): Metadata {
	const canonical = absoluteSiteUrl(path);
	const absoluteImage = absoluteSiteUrl(image);
	return {
		title: absoluteTitle ? { absolute: title } : title,
		description,
		alternates: { canonical },
		openGraph: {
			type: "website",
			url: canonical,
			siteName: SITE_NAME,
			locale: "zh_CN",
			title,
			description,
			images: absoluteImage
				? [{ url: absoluteImage, alt: SITE_NAME }]
				: undefined,
		},
		twitter: {
			card: absoluteImage ? "summary_large_image" : "summary",
			title,
			description,
			images: absoluteImage ? [absoluteImage] : undefined,
		},
	};
}
