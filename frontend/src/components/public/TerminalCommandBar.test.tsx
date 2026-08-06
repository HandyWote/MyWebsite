import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TerminalCommandBar } from "./TerminalCommandBar";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const articles = [
	{ id: 3, title: "Go 与 Gin 实践" },
	{ id: 7, title: "Next.js 数据流" },
	{ id: 11, title: "React Server Components" },
];

const input = () => screen.getByLabelText("Terminal command");
const type = (value: string) =>
	fireEvent.change(input(), { target: { value } });
const pressKey = (key: string) => fireEvent.keyDown(input(), { key });

const renderBar = (
	props: {
		commands?: string[];
		articles?: { id: number; title: string }[];
		currentArticleId?: number;
	} = {},
) =>
	render(
		<TerminalCommandBar
			cwd="~/app/articles"
			commands={["open prev", "open next", "cd projects/", "help"]}
			articles={articles}
			{...props}
		/>,
	);

describe("TerminalCommandBar", () => {
	beforeEach(() => {
		pushMock.mockReset();
	});

	it("shows multi-line help output", () => {
		renderBar();
		type("help");
		pressKey("Enter");
		expect(screen.getByText("Available commands:")).toBeInTheDocument();
		expect(
			screen.getByText("open <article> open article by id/title"),
		).toBeInTheDocument();
		expect(screen.getByText("help show this help")).toBeInTheDocument();
	});

	it("clears output with the clear command", () => {
		renderBar();
		type("help");
		pressKey("Enter");
		expect(screen.getByText("Available commands:")).toBeInTheDocument();
		type("clear");
		pressKey("Enter");
		expect(screen.queryByText("Available commands:")).not.toBeInTheDocument();
	});

	it("reports unknown commands", () => {
		renderBar();
		type("foobar");
		pressKey("Enter");
		expect(screen.getByText("command not found: foobar")).toBeInTheDocument();
	});

	it("navigates with cd/home commands", () => {
		renderBar();
		type("cd articles/");
		pressKey("Enter");
		expect(pushMock).toHaveBeenLastCalledWith("/articles");

		type("cd projects");
		pressKey("Enter");
		expect(pushMock).toHaveBeenLastCalledWith("/projects");

		type("home");
		pressKey("Enter");
		expect(pushMock).toHaveBeenLastCalledWith("/");

		type("cd about");
		pressKey("Enter");
		expect(pushMock).toHaveBeenLastCalledWith("/");
	});

	it("opens the latest article", () => {
		renderBar();
		type("open latest");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/3");
	});

	it("opens previous and next articles around the current id", () => {
		renderBar({ currentArticleId: 7 });
		type("open prev");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/3");

		pushMock.mockClear();
		type("open next");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/11");
	});

	it("reports missing previous at the first article", () => {
		renderBar({ currentArticleId: 3 });
		type("open prev");
		pressKey("Enter");
		expect(screen.getByText("no previous article")).toBeInTheDocument();
	});

	it("reports missing next at the last article", () => {
		renderBar({ currentArticleId: 11 });
		type("open next");
		pressKey("Enter");
		expect(screen.getByText("no next article")).toBeInTheDocument();
	});

	it("opens articles by numeric id", () => {
		renderBar();
		type("open 11");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/11");
	});

	it("opens articles by exact title and slug match", () => {
		renderBar();
		type("open Next.js 数据流");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/7");

		pushMock.mockClear();
		type("open next.js 数据流");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/7");
	});

	it("reports unmatched open targets", () => {
		renderBar();
		type("open 不存在的文章");
		pressKey("Enter");
		expect(
			screen.getByText("command not found: open 不存在的文章"),
		).toBeInTheDocument();
	});

	it("exits the article buffer back to the list", () => {
		renderBar({ currentArticleId: 7 });
		type("exit");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles");
	});

	it("filters candidates from commands and article titles, capped at 8", () => {
		const manyArticles = Array.from({ length: 10 }, (_, index) => ({
			id: index + 1,
			title: `Article number ${index + 1}`,
		}));
		renderBar({ commands: [], articles: manyArticles });

		type("open ");
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(8);
		expect(options[0]).toHaveTextContent("Article number 1");
	});

	it("completes with Tab and cycles with ArrowDown/ArrowUp", () => {
		renderBar();
		type("open ");
		pressKey("Tab");
		expect(input()).toHaveValue("open prev");

		type("open ");
		pressKey("ArrowDown");
		pressKey("Tab");
		expect(input()).toHaveValue("open next");

		type("open ");
		pressKey("ArrowUp");
		pressKey("Tab");
		expect(input()).toHaveValue("open React Server Components");
	});

	it("highlights the active candidate with the arrow marker", () => {
		renderBar();
		type("o");
		const options = screen.getAllByRole("option");
		expect(options[0]).toHaveAttribute("aria-selected", "true");
		expect(options[0]).toHaveTextContent("▸");
		expect(options[1]).toHaveAttribute("aria-selected", "false");
		pressKey("ArrowDown");
		expect(options[1]).toHaveAttribute("aria-selected", "true");
	});

	it("executes the active candidate on Enter", () => {
		renderBar({ currentArticleId: 7 });
		type("open N");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles/11");
	});

	it("executes a clicked candidate", () => {
		renderBar();
		type("o");
		fireEvent.mouseDown(screen.getByText("open React Server Components"));
		expect(pushMock).toHaveBeenCalledWith("/articles/11");
	});

	it("uses a safe default when no articles are available", () => {
		renderBar({ articles: [] });
		type("open latest");
		pressKey("Enter");
		expect(pushMock).toHaveBeenCalledWith("/articles");
	});
});
