import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerApiError } from "@/api/server";
import type { Article } from "@/api/types";
import ArticlePage, { generateMetadata } from "./page";

const { getArticleForPageMock, notFoundMock } = vi.hoisted(() => ({
	getArticleForPageMock: vi.fn(),
	notFoundMock: vi.fn(),
}));

vi.mock("@/seo/data.server", () => ({
	getArticleForPage: getArticleForPageMock,
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/components/public/ArticleExitButton", () => ({
	ArticleExitButton: () => <button type="button">exit buffer</button>,
}));
vi.mock("@/components/public/PublicShell", () => ({
	PublicShell: ({ children }: { children: ReactNode }) => (
		<main>{children}</main>
	),
}));
vi.mock("@/components/public/ArticleActions", () => ({
	ArticleActions: () => <div data-article-actions />,
}));
vi.mock("@/components/public/CommentSectionClient", () => ({
	CommentSectionClient: () => <div data-comments />,
}));
vi.mock("@/components/public/PdfViewerClient", () => ({
	PdfViewerClient: ({ filename, url }: { filename: string; url: string }) => (
		<div data-pdf-viewer={filename} data-pdf-url={url} />
	),
}));

const markdownArticle: Article = {
	id: 7,
	title: "SSR article",
	summary: "Article summary",
	category: "SEO",
	tags: "next, markdown",
	content_type: "markdown",
	content: "# Complete body\n\nVisible before hydration.",
	cover_url: "/uploads/cover.webp",
	created_at: "2026-08-01T00:00:00Z",
	updated_at: "2026-08-02T00:00:00Z",
};

describe("article page SEO rendering", () => {
	beforeEach(() => {
		process.env.PUBLIC_SITE_URL = "https://portfolio.example";
		getArticleForPageMock.mockReset();
		notFoundMock.mockReset();
	});

	it("generates canonical Article metadata with absolute media", async () => {
		getArticleForPageMock.mockResolvedValue(markdownArticle);

		await expect(
			generateMetadata({ params: Promise.resolve({ id: "7" }) }),
		).resolves.toMatchObject({
			title: "SSR article",
			description: "Article summary",
			alternates: { canonical: "https://portfolio.example/articles/7" },
			openGraph: {
				type: "article",
				images: [{ url: "https://portfolio.example/uploads/cover.webp" }],
			},
			twitter: {
				card: "summary_large_image",
				images: ["https://portfolio.example/uploads/cover.webp"],
			},
		});
	});

	it("puts the complete Markdown body and safe native Article JSON-LD in initial HTML", async () => {
		getArticleForPageMock.mockResolvedValue({
			...markdownArticle,
			title: "</script><script>alert(1)</script>",
		});

		const html = renderToStaticMarkup(
			await ArticlePage({ params: Promise.resolve({ id: "7" }) }),
		);
		expect(html).toContain("<h1>Complete body</h1>");
		expect(html).toContain("cursor-blink");
		expect(html).toContain("<p>Visible before hydration.</p>");
		expect(html).toContain('type="application/ld+json"');
		expect(html).toContain(
			"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>",
		);
		expect(html).not.toContain("</script><script>alert(1)</script>");
	});

	it("server-renders PDF summary, taxonomy and a stable link before enhancing the viewer", async () => {
		getArticleForPageMock.mockResolvedValue({
			...markdownArticle,
			content_type: "pdf",
			content: "",
			pdf_filename: "articles/pdfs/paper.pdf",
			pdf_url: "/uploads/articles/pdfs/paper.pdf",
		});

		const html = renderToStaticMarkup(
			await ArticlePage({ params: Promise.resolve({ id: "7" }) }),
		);
		expect(html).toContain("SSR article");
		expect(html).toContain("Article summary");
		expect(html).toContain("SEO");
		expect(html).toContain("next");
		expect(html).toContain(
			'href="https://portfolio.example/uploads/articles/pdfs/paper.pdf"',
		);
		expect(html).toContain(
			'data-pdf-url="https://portfolio.example/uploads/articles/pdfs/paper.pdf"',
		);
	});

	it("turns a missing backend article into the Next not-found response", async () => {
		getArticleForPageMock.mockRejectedValue(new ServerApiError(404, "missing"));
		notFoundMock.mockImplementation(() => {
			throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
		});

		await expect(
			ArticlePage({ params: Promise.resolve({ id: "404" }) }),
		).rejects.toThrow("404");
		expect(notFoundMock).toHaveBeenCalledOnce();
	});
});
