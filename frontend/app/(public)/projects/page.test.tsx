import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectsPage from "./page";

const { getProjectsMock } = vi.hoisted(() => ({
	getProjectsMock: vi.fn(),
}));

vi.mock("@/api/publicApi.server", () => ({
	getProjects: getProjectsMock,
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/components/public/PublicShell", () => ({
	PublicShell: ({ children }: { children: ReactNode }) => (
		<main>{children}</main>
	),
}));
vi.mock("@/components/public/RevealList", () => ({
	RevealList: ({
		children,
		gap,
		direction,
		stagger,
		maxDelay,
	}: {
		children: ReactNode;
		gap?: number;
		direction?: string;
		stagger?: number;
		maxDelay?: number;
	}) => (
		<div
			data-testid="reveal-list"
			data-gap={gap}
			data-direction={direction}
			data-stagger={stagger}
			data-max-delay={maxDelay}
		>
			{children}
		</div>
	),
}));

const projects = [
	{
		id: 1,
		name: "pixel-portfolio",
		description: "A pixel-styled personal site.",
		tags: ["next", "go"],
		stars: 42,
		forks: 7,
		updatedAt: "Aug 01, 2026",
		url: "https://github.com/HandyWote/pixel-portfolio",
	},
	{
		id: 2,
		name: "cli-tool",
		description: "A tiny CLI utility.",
		tags: ["go"],
		stars: 3,
		forks: 0,
		updatedAt: "Jul 15, 2026",
		url: "https://github.com/HandyWote/cli-tool",
	},
];

const config = { empty_text: "No repositories yet." };

describe("ProjectsPage", () => {
	it("renders the terminal header and project cards with pixel details", async () => {
		getProjectsMock.mockResolvedValue({ config, projects, error: "" });

		render(await ProjectsPage());

		expect(screen.getByText("$ ls -la ./projects/")).toBeInTheDocument();
		expect(screen.getByText("found 2 repositories")).toBeInTheDocument();

		expect(screen.getByTestId("reveal-list")).toHaveAttribute(
			"data-direction",
			"up",
		);
		expect(screen.getByTestId("reveal-list")).toHaveAttribute(
			"data-gap",
			"0.75",
		);
		expect(screen.getByTestId("reveal-list")).toHaveAttribute(
			"data-stagger",
			"0.025",
		);
		expect(screen.getByTestId("reveal-list")).toHaveAttribute(
			"data-max-delay",
			"0.35",
		);

		expect(
			screen.getByRole("heading", { name: "pixel-portfolio" }),
		).toBeInTheDocument();

		const link = screen.getByRole("link", { name: /pixel-portfolio/ });
		expect(link).toHaveAttribute(
			"href",
			"https://github.com/HandyWote/pixel-portfolio",
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");

		expect(
			screen.getByText("A pixel-styled personal site."),
		).toBeInTheDocument();
		expect(screen.getByText("next")).toBeInTheDocument();
		expect(screen.getAllByText("go")).toHaveLength(2);
		expect(screen.getByText(/★ 42/)).toBeInTheDocument();
		expect(screen.getByText(/⑂ 7/)).toBeInTheDocument();
		expect(screen.getByText(/updated Aug 01, 2026/)).toBeInTheDocument();
	});

	it("shows the empty state when there are no projects", async () => {
		getProjectsMock.mockResolvedValue({ config, projects: [], error: "" });

		render(await ProjectsPage());

		expect(screen.getByText("found 0 repositories")).toBeInTheDocument();
		expect(screen.getByText("No repositories yet.")).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("shows the error line instead of project content on failure", async () => {
		getProjectsMock.mockResolvedValue({
			config,
			projects: [],
			error: "GitHub API error: 403",
		});

		render(await ProjectsPage());

		expect(
			screen.getByText("error: GitHub API error: 403"),
		).toBeInTheDocument();
		expect(screen.queryByText("found 0 repositories")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
