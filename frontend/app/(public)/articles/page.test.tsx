import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArticlesPage, { generateMetadata } from "./page";

const { getArticlePageMock, getArticlesPageConfigMock } = vi.hoisted(() => ({
	getArticlePageMock: vi.fn(),
	getArticlesPageConfigMock: vi.fn(),
}));

vi.mock("@/api/publicApi.server", () => ({
	getArticlePage: getArticlePageMock,
	getArticlesPageConfig: getArticlesPageConfigMock,
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/components/public/PublicShell", () => ({
	PublicShell: ({ children }: { children: ReactNode }) => (
		<main>{children}</main>
	),
}));
vi.mock("next/link", () => ({
	default: ({
		children,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
		<a {...props}>{children}</a>
	),
}));
vi.mock("framer-motion", () => ({
	motion: {
		div: ({
			children,
			initial: _initial,
			animate: _animate,
			transition: _transition,
			...props
		}: HTMLAttributes<HTMLDivElement> & {
			initial?: unknown;
			animate?: unknown;
			transition?: unknown;
		}) => <div {...props}>{children}</div>,
	},
}));

const TOTAL_ARTICLES = 25;

const articles = Array.from({ length: TOTAL_ARTICLES }, (_, index) => ({
	id: index + 1,
	title: `Article ${index + 1}`,
	category: "seo",
	created_at: "2026-08-01T00:00:00Z",
}));

const config = { title: "~/articles", subtitle: "", empty_text: "No articles found." };

function renderPage(page?: string) {
	return ArticlesPage({
		searchParams: Promise.resolve(page ? { page } : {}),
	});
}

describe("ArticlesPage pagination", () => {
	beforeEach(() => {
		process.env.PUBLIC_SITE_URL = "https://portfolio.example";
		getArticlesPageConfigMock.mockResolvedValue(config);
		getArticlePageMock.mockImplementation(async (page = 1, perPage = 10) => {
			const start = (page - 1) * perPage;
			return {
				items: articles.slice(start, start + perPage),
				total: TOTAL_ARTICLES,
				page,
				per_page: perPage,
			};
		});
	});

	afterEach(() => {
		delete process.env.PUBLIC_SITE_URL;
		getArticlePageMock.mockReset();
		getArticlesPageConfigMock.mockReset();
	});

	it("server-renders the requested page from ?page=N", async () => {
		const { container } = render(await renderPage("2"));

		expect(getArticlePageMock).toHaveBeenCalledWith(2, 10);
		expect(screen.getByText("▸ Article 11")).toBeInTheDocument();
		expect(screen.getByText("▸ Article 20")).toBeInTheDocument();
		expect(screen.queryByText("▸ Article 10")).not.toBeInTheDocument();
		expect(screen.queryByText("▸ Article 21")).not.toBeInTheDocument();
		expect(container.querySelectorAll("a.article-card-link")).toHaveLength(10);
	});

	it("renders crawlable prev/page/next links for the current page", async () => {
		const { container } = render(await renderPage("2"));

		const hrefs = Array.from(
			container.querySelectorAll("nav[aria-label='Articles pagination'] a"),
		).map((link) => link.getAttribute("href"));
		expect(hrefs).toEqual([
			"/articles?page=1",
			"/articles?page=1",
			"/articles?page=2",
			"/articles?page=3",
			"/articles?page=3",
		]);
		expect(screen.getByRole("link", { name: /prev/ })).toHaveAttribute(
			"href",
			"/articles?page=1",
		);
		expect(screen.getByRole("link", { name: /next/ })).toHaveAttribute(
			"href",
			"/articles?page=3",
		);
		expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	it("omits prev on the first page", async () => {
		render(await renderPage());

		expect(getArticlePageMock).toHaveBeenCalledWith(1, 10);
		expect(screen.queryByRole("link", { name: /prev/ })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: /next/ })).toHaveAttribute(
			"href",
			"/articles?page=2",
		);
	});

	it("omits next on the last page", async () => {
		render(await renderPage("3"));

		expect(screen.getByText("▸ Article 25")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /prev/ })).toHaveAttribute(
			"href",
			"/articles?page=2",
		);
		expect(screen.queryByRole("link", { name: /next/ })).not.toBeInTheDocument();
	});

	it("falls back to the first page for invalid page params", async () => {
		render(await renderPage("0"));

		expect(getArticlePageMock).toHaveBeenCalledWith(1, 10);
	});

	it("points canonical at the paginated URL and keeps page 1 on /articles", async () => {
		await expect(
			generateMetadata({ searchParams: Promise.resolve({ page: "2" }) }),
		).resolves.toMatchObject({
			title: "Articles · page 2",
			alternates: { canonical: "https://portfolio.example/articles?page=2" },
		});
		await expect(
			generateMetadata({ searchParams: Promise.resolve({}) }),
		).resolves.toMatchObject({
			title: "Articles",
			alternates: { canonical: "https://portfolio.example/articles" },
		});
	});
});
