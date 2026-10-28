import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleDetailNav } from "./ArticleDetailNav";

const articles = [
	{ id: 3, title: "Go 与 Gin 实践" },
	{ id: 7, title: "Next.js 数据流" },
];

describe("ArticleDetailNav", () => {
	it("renders the article list with the current one marked active", () => {
		render(<ArticleDetailNav articles={articles} currentId={7} />);

		expect(screen.getByText("articles")).toBeInTheDocument();
		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(2);

		const activeLink = links.find((link) =>
			link.textContent?.includes("Next.js 数据流"),
		);
		const idleLink = links.find((link) =>
			link.textContent?.includes("Go 与 Gin 实践"),
		);
		expect(activeLink).toHaveAttribute("data-active", "true");
		expect(activeLink).toHaveTextContent("▸");
		expect(idleLink).toHaveAttribute("data-active", "false");
		expect(idleLink).not.toHaveTextContent("▸");
	});

	it("links each article to its detail page", () => {
		render(<ArticleDetailNav articles={articles} currentId={3} />);

		expect(screen.getByRole("link", { name: /Next.js 数据流/ })).toHaveAttribute(
			"href",
			"/articles/7",
		);
		expect(screen.getByRole("link", { name: /Go 与 Gin 实践/ })).toHaveAttribute(
			"href",
			"/articles/3",
		);
	});

	it("shows a loading state", () => {
		render(<ArticleDetailNav articles={articles} loading />);
		expect(screen.getByText("loading...")).toBeInTheDocument();
		expect(screen.queryAllByRole("link")).toHaveLength(0);
	});

	it("renders empty when no articles are given", () => {
		render(<ArticleDetailNav />);
		expect(screen.getByText("articles")).toBeInTheDocument();
		expect(screen.queryAllByRole("link")).toHaveLength(0);
	});
});
