import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleListMore } from "./ArticleListMore";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/api/browser", () => ({
	browserApi: { get: getMock },
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

const observerCallbacks: IntersectionObserverCallback[] = [];

class TestIntersectionObserver {
	constructor(callback: IntersectionObserverCallback) {
		observerCallbacks.push(callback);
	}

	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

const articles = [
	{
		id: 1,
		title: "First article",
		category: "frontend",
		created_at: "2025-01-01T00:00:00Z",
	},
	{
		id: 2,
		title: "Second article",
		category: "backend",
		created_at: "2025-01-02T00:00:00Z",
	},
];

function triggerIntersect() {
	const callback = observerCallbacks.at(-1);
	if (!callback) throw new Error("IntersectionObserver was not registered");
	callback(
		[
			{
				isIntersecting: true,
			} as IntersectionObserverEntry,
		],
		{} as IntersectionObserver,
	);
}

describe("ArticleListMore", () => {
	beforeEach(() => {
		getMock.mockReset();
		observerCallbacks.length = 0;
		Object.defineProperty(window, "IntersectionObserver", {
			writable: true,
			value: TestIntersectionObserver,
		});
	});

	it("renders the server-provided first page without a manual load button", () => {
		render(
			<ArticleListMore
				initialArticles={[articles[0]]}
				total={1}
				pageSize={1}
			/>,
		);

		expect(screen.getByRole("link", { name: /First article/ })).toHaveAttribute(
			"href",
			"/articles/1",
		);
		expect(
			screen.queryByRole("button", { name: /load more/i }),
		).not.toBeInTheDocument();
		expect(getMock).not.toHaveBeenCalled();
	});

	it("loads the next page from the sentinel into the same reveal list", async () => {
		getMock.mockResolvedValueOnce({ items: [articles[1]], total: 2 });
		render(
			<ArticleListMore
				initialArticles={[articles[0]]}
				total={2}
				pageSize={1}
			/>,
		);

		act(() => triggerIntersect());

		await waitFor(() =>
			expect(getMock).toHaveBeenCalledWith("/api/articles?page=2&per_page=1"),
		);
		expect(
			await screen.findByRole("link", { name: /Second article/ }),
		).toHaveAttribute("href", "/articles/2");

		const links = screen.getAllByRole("link");
		expect(links[0].parentElement?.parentElement).toBe(
			links[1].parentElement?.parentElement,
		);
		expect(links[0].parentElement?.parentElement).toHaveStyle({ gap: "12px" });
	});
});
