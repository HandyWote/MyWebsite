import { afterEach, describe, expect, it } from "vitest";
import type { Article } from "@/api/types";
import {
	absoluteSiteUrl,
	articleJsonLd,
	articleMetadata,
	getArticlePdfUrl,
	pageMetadata,
	serializeJsonLd,
	summarizeArticle,
} from "./site";

const article: Article = {
	id: 7,
	title: "Safe metadata",
	summary: "A useful summary",
	category: "Next.js",
	tags: "seo, react",
	cover_url: "/uploads/cover.webp",
	content: "# Body",
	created_at: "2026-08-01T00:00:00Z",
	updated_at: "2026-08-02T00:00:00Z",
};

describe("SEO site helpers", () => {
	afterEach(() => {
		delete process.env.PUBLIC_SITE_URL;
	});

	it("builds canonical metadata and absolute media URLs only from PUBLIC_SITE_URL", () => {
		process.env.PUBLIC_SITE_URL = "https://portfolio.example/base-path";
		const metadata = articleMetadata(article);

		expect(metadata.alternates?.canonical).toBe(
			"https://portfolio.example/articles/7",
		);
		expect(metadata.description).toBe("A useful summary");
		expect(metadata.openGraph).toMatchObject({
			type: "article",
			url: "https://portfolio.example/articles/7",
			images: [
				{
					url: "https://portfolio.example/uploads/cover.webp",
					alt: "Safe metadata",
				},
			],
		});
		expect(metadata.twitter).toMatchObject({
			card: "summary_large_image",
			images: ["https://portfolio.example/uploads/cover.webp"],
		});
		expect(absoluteSiteUrl("https://cdn.example/media.webp")).toBe(
			"https://cdn.example/media.webp",
		);
	});

	it("creates stable PDF links and a plain-text description fallback", () => {
		process.env.PUBLIC_SITE_URL = "https://portfolio.example";
		expect(getArticlePdfUrl({ pdf_filename: "paper name.pdf" })).toBe(
			"https://portfolio.example/api/articles/pdf/paper%20name.pdf",
		);
		expect(
			summarizeArticle({
				content: "# Heading\n\n[Visible](https://example.com) `hidden`",
			}),
		).toBe("Heading Visible");
	});

	it("can opt out of the parent title template for the homepage title", () => {
		const metadata = pageMetadata({
			title: "HandyWote ｜ Unself",
			absoluteTitle: true,
			description: "Profile",
			path: "/",
		});

		expect(metadata.title).toEqual({ absolute: "HandyWote ｜ Unself" });
	});

	it("serializes Article JSON-LD without a script-closing injection", () => {
		process.env.PUBLIC_SITE_URL = "https://portfolio.example";
		const malicious = {
			...article,
			title: "</script><script>alert(1)</script>",
		};
		const serialized = serializeJsonLd(articleJsonLd(malicious));

		expect(serialized).not.toContain("<");
		expect(serialized).toContain("\\u003c/script>");
		expect(() => JSON.parse(serialized)).not.toThrow();
		const parsed = JSON.parse(serialized) as { headline: string };
		expect(parsed.headline).toBe("</script><script>alert(1)</script>");
	});
});
