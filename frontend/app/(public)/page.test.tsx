import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
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
vi.mock("next/image", () => ({
	default: ({
		priority: _priority,
		...props
	}: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
		<img {...props} />
	),
}));
vi.mock("next/link", () => ({
	default: ({
		children,
		...props
	}: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/public/HomeEnterBoundary", () => ({
	HomeEnterBoundary: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}));
vi.mock("@/components/public/TerminalCommandBar", () => ({
	TerminalCommandBar: () => <div data-testid="terminal-command-bar" />,
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

describe("HomePage", () => {
	it("renders server profile content and enhances it with the configured GitHub calendar", async () => {
		getPublicProfileMock.mockResolvedValue({
			home: {
				title: "Configured title",
				subtitle: "Configured subtitle",
				github_calendar_url: "https://ghchart.rshah.org/octocat",
			},
			sidebar: {
				social_links: [{ label: "GitHub", href: "https://github.com/octocat" }],
				education: [
					{ school: "Example University", degree: "CS", period: "2020-2024" },
				],
				tech_stack: [{ name: "Next.js" }],
			},
			avatarUrl: "/avatar.webp",
		});

		render(await HomePage());

		expect(
			screen.getByRole("heading", { name: "Configured title" }),
		).toBeInTheDocument();
		expect(screen.getByText("$ Configured subtitle")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
			"href",
			"https://github.com/octocat",
		);
		expect(screen.getByTestId("github-activity")).toHaveAttribute(
			"data-username",
			"octocat",
		);
		expect(screen.getByTestId("github-activity")).toHaveAttribute(
			"data-compact",
			"false",
		);
	});
});
