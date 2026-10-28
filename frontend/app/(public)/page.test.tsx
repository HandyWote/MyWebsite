import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const { getPublicProfileMock } = vi.hoisted(() => ({
	getPublicProfileMock: vi.fn(),
}));

vi.mock("@/seo/data.server", () => ({
	getProfileForPage: getPublicProfileMock,
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/components/public/PublicShell", () => ({
	PublicShell: ({ children }: { children: ReactNode }) => (
		<div data-testid="public-shell">{children}</div>
	),
}));
vi.mock("@/components/sidebar/GitHubActivity", () => ({
	default: ({ username, compact }: { username: string; compact: boolean }) => (
		<div
			data-testid="github-activity"
			data-username={username}
			data-compact={String(compact)}
		/>
	),
}));

const profile = () => ({
	home: {
		title: "HandyWote",
		subtitle: "少年侠气交结五都雄！",
		github_calendar_url: "https://ghchart.rshah.org/HandyWote",
		author: "汕头大学 | 黄应辉",
		github_url: "https://github.com/HandyWote",
	},
	sidebar: {
		social_links: [{ label: "GitHub", href: "https://github.com/HandyWote" }],
		education: [
			{
				school: "示例科技 · 后端实习",
				period: "2024.07 - 09",
				points: ["P99 320ms → 90ms"],
			},
		],
		tech_stack: [{ name: "Go" }],
	},
	avatarUrl: "/api/avatars/file/x.png",
});

async function renderHome() {
	getPublicProfileMock.mockResolvedValue(profile());
	render(await HomePage());
}

describe("HomePage", () => {
	it("renders the about content with the configured GitHub calendar", async () => {
		await renderHome();

		expect(screen.getByText("HandyWote")).toBeInTheDocument();
		expect(screen.getByText("$ 少年侠气交结五都雄！")).toBeInTheDocument();
		expect(screen.getByText("$ cat about.md")).toBeInTheDocument();
		expect(screen.getByText("示例科技 · 后端实习 (2024.07 - 09)")).toBeInTheDocument();
		expect(screen.getByText("P99 320ms → 90ms")).toBeInTheDocument();
		expect(screen.getByText("Go")).toBeInTheDocument();
		expect(screen.getByTestId("github-activity")).toHaveAttribute(
			"data-username",
			"HandyWote",
		);
	});

	it("ships WebSite + Person JSON-LD for search engines", async () => {
		await renderHome();

		const scripts = document.querySelectorAll('script[type="application/ld+json"]');
		const types = [...scripts].map((node) =>
			JSON.parse(node.textContent ?? "{}"),
		);
		expect(
			types.filter((entry) => entry["@type"] === "WebSite"),
		).toHaveLength(1);
		expect(types.filter((entry) => entry["@type"] === "Person")).toHaveLength(1);
	});

	it("contains no double-click hint copy", async () => {
		await renderHome();

		expect(screen.queryByText(/double click/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/intro\.md/i)).not.toBeInTheDocument();
	});
});
