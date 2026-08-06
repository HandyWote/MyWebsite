import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleDetailNav } from "./ArticleDetailNav";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const articles = [
	{ id: 3, title: "Go 与 Gin 实践" },
	{ id: 7, title: "Next.js 数据流" },
];

describe("ArticleDetailNav", () => {
	beforeEach(() => {
		pushMock.mockReset();
	});

	it("renders the article list with the current one marked active", () => {
		render(<ArticleDetailNav articles={articles} currentId={7} />);

		expect(screen.getByText("articles")).toBeInTheDocument();
		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(2);

		const activeButton = buttons.find((button) =>
			button.textContent?.includes("Next.js 数据流"),
		);
		const idleButton = buttons.find((button) =>
			button.textContent?.includes("Go 与 Gin 实践"),
		);
		expect(activeButton).toHaveAttribute("data-active", "true");
		expect(activeButton).toHaveTextContent("▸");
		expect(idleButton).toHaveAttribute("data-active", "false");
		expect(idleButton).not.toHaveTextContent("▸");
	});

	it("navigates to the clicked article", () => {
		render(<ArticleDetailNav articles={articles} currentId={3} />);
		fireEvent.click(screen.getByRole("button", { name: /Next.js 数据流/ }));
		expect(pushMock).toHaveBeenCalledWith("/articles/7");
	});

	it("shows a loading state", () => {
		render(<ArticleDetailNav articles={articles} loading />);
		expect(screen.getByText("loading...")).toBeInTheDocument();
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});

	it("renders empty when no articles are given", () => {
		render(<ArticleDetailNav />);
		expect(screen.getByText("articles")).toBeInTheDocument();
		expect(screen.queryAllByRole("button")).toHaveLength(0);
	});
});
