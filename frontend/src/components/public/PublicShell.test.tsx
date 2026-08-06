import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicShell } from "./PublicShell";

const { getArticlePageMock } = vi.hoisted(() => ({
	getArticlePageMock: vi.fn(),
}));

vi.mock("@/api/publicApi.server", () => ({
	getArticlePage: getArticlePageMock,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
	default: ({
		children,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

const articles = [
	{ id: 3, title: "Go 与 Gin 实践" },
	{ id: 7, title: "Next.js 数据流" },
];

const renderShell = async (activePath: string) => {
	const element = await PublicShell({
		activePath,
		children: <div>page body</div>,
	});
	return render(element);
};

describe("PublicShell", () => {
	beforeEach(() => {
		getArticlePageMock.mockReset();
		getArticlePageMock.mockResolvedValue({ items: articles });
	});

	it("fetches 100 articles for the terminal and sidebar", async () => {
		await renderShell("/articles");
		expect(getArticlePageMock).toHaveBeenCalledWith(1, 100);
	});

	it("renders the explorer sidebar on the article list page", async () => {
		await renderShell("/articles");
		expect(screen.getByText("explorer")).toBeInTheDocument();
		expect(screen.getByText("articles")).toBeInTheDocument();
		expect(screen.getByText("projects")).toBeInTheDocument();
		expect(screen.getByText("~/app/articles/")).toBeInTheDocument();
		expect(screen.queryByText("Next.js 数据流")).not.toBeInTheDocument();
	});

	it("swaps the sidebar for the article list on detail pages and highlights the current article", async () => {
		await renderShell("/articles/7");
		expect(screen.queryByText("explorer")).not.toBeInTheDocument();
		expect(screen.getByText("~/app/articles/")).toBeInTheDocument();
		expect(screen.getByText("Next.js 数据流")).toBeInTheDocument();

		const buttons = screen.getAllByRole("button");
		const activeButton = buttons.find((button) =>
			button.textContent?.includes("Next.js 数据流"),
		);
		expect(activeButton).toHaveAttribute("data-active", "true");
	});

	it("uses the projects cwd and explorer on the projects page", async () => {
		await renderShell("/projects");
		expect(screen.getByText("~/app/projects/")).toBeInTheDocument();
		expect(screen.getByText("explorer")).toBeInTheDocument();
	});

	it("falls back to an empty article list when fetching fails", async () => {
		getArticlePageMock.mockRejectedValue(new Error("backend down"));
		await renderShell("/articles/7");
		expect(screen.getByText("~/app/articles/")).toBeInTheDocument();
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});

	it("renders the page body", async () => {
		await renderShell("/articles");
		expect(screen.getByText("page body")).toBeInTheDocument();
	});
});
