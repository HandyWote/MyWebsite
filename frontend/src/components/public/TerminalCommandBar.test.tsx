import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserInfo } from "@/api/authApi";
import { TerminalCommandBar } from "./TerminalCommandBar";

const { pushMock, loginMock, sessionMock } = vi.hoisted(() => {
	const session = {
		status: "guest",
		user: null as UserInfo | null,
		login: vi.fn(),
		logout: vi.fn(),
		refresh: vi.fn(),
	};
	return {
		pushMock: vi.fn(),
		loginMock: vi.fn(),
		sessionMock: session,
	};
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/hooks/useSession", () => ({ useSession: () => sessionMock }));

vi.mock("@/api/authApi", () => ({
	authApi: {
		login: loginMock,
		buildGithubAuthorizeUrl: (redirectTo?: string) =>
			redirectTo
				? `/api/auth/github/authorize?redirect_to=${encodeURIComponent(redirectTo)}`
				: "/api/auth/github/authorize",
	},
}));

const articles = [
	{ id: 3, title: "Go 与 Gin 实践" },
	{ id: 7, title: "Next.js 数据流" },
	{ id: 11, title: "React Server Components" },
];

const input = () => screen.getByLabelText("Terminal command");
const passwordInput = () => screen.getByLabelText("Password");
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
		loginMock.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		sessionMock.login.mockReset();
		sessionMock.logout.mockReset();
		sessionMock.refresh.mockReset();
		// 静态 location 桩：jsdom 不支持导航，href 赋值仅记录，pathname/search 可控。
		Object.defineProperty(window, "location", {
			writable: true,
			value: { pathname: "/articles", search: "?page=1", href: "" },
		});
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

	describe("auth commands", () => {
		it("redirects to GitHub authorization when a guest runs login", () => {
			renderBar();
			type("login");
			pressKey("Enter");
			expect(
				screen.getByText("opening GitHub authorization…"),
			).toBeInTheDocument();
			expect(window.location.href).toBe(
				"/api/auth/github/authorize?redirect_to=%2Farticles%3Fpage%3D1",
			);
		});

		it("treats 'login github' as the GitHub flow", () => {
			renderBar();
			type("login github");
			pressKey("Enter");
			expect(window.location.href).toBe(
				"/api/auth/github/authorize?redirect_to=%2Farticles%3Fpage%3D1",
			);
		});

		it("normalizes case and whitespace for auth commands", () => {
			renderBar();
			type("  LOGIN   GITHUB ");
			pressKey("Enter");
			expect(window.location.href).toBe(
				"/api/auth/github/authorize?redirect_to=%2Farticles%3Fpage%3D1",
			);
		});

		it("rejects login when already logged in", () => {
			sessionMock.status = "authed";
			sessionMock.user = { username: "handywote", provider: "github" };
			renderBar();
			type("login");
			pressKey("Enter");
			expect(
				screen.getByText(
					"already logged in as handywote, use logout first",
				),
			).toBeInTheDocument();
			expect(window.location.href).toBe("");
		});

		it("shows the username in the prompt when logged in", () => {
			sessionMock.status = "authed";
			sessionMock.user = { username: "handywote", provider: "github" };
			renderBar();
			expect(
				screen.getByText("handywote@~/app/articles $"),
			).toBeInTheDocument();
		});

		it("shows the guest prompt when logged out", () => {
			renderBar();
			expect(screen.getByText("guest@~/app/articles $")).toBeInTheDocument();
		});

		it("enters masked password mode with login -u", () => {
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			expect(screen.getByText("password:")).toBeInTheDocument();
			fireEvent.change(passwordInput(), { target: { value: "secret" } });
			expect(screen.getByText("*".repeat(6))).toBeInTheDocument();
			expect(passwordInput()).toHaveValue("secret");
		});

		it("cancels password mode with Escape", () => {
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			fireEvent.change(passwordInput(), { target: { value: "secret" } });
			fireEvent.keyDown(passwordInput(), { key: "Escape" });
			expect(screen.queryByText("password:")).not.toBeInTheDocument();
			expect(input()).toHaveValue("");
		});

		it("cancels password mode with an empty Enter", () => {
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			fireEvent.keyDown(passwordInput(), { key: "Enter" });
			expect(screen.queryByText("password:")).not.toBeInTheDocument();
			expect(input()).toBeInTheDocument();
		});

		it("reports invalid credentials and stays in password mode for retry", async () => {
			loginMock.mockRejectedValue(new Error("Invalid username or password"));
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			fireEvent.change(passwordInput(), { target: { value: "wrong" } });
			fireEvent.keyDown(passwordInput(), { key: "Enter" });
			expect(
				await screen.findByText("invalid credentials"),
			).toBeInTheDocument();
			expect(screen.getByText("password:")).toBeInTheDocument();
			expect(passwordInput()).toHaveValue("");
			expect(loginMock).toHaveBeenCalledWith({
				username: "admin",
				password: "wrong",
				remember: false,
			});
		});

		it("stores the token and navigates to /admin on success", async () => {
			loginMock.mockResolvedValue({ token: "jwt-token" });
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			fireEvent.change(passwordInput(), { target: { value: "admin-pass" } });
			fireEvent.keyDown(passwordInput(), { key: "Enter" });
			await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin"));
			expect(sessionMock.login).toHaveBeenCalledWith("jwt-token", {
				username: "admin",
				provider: "password",
			});
		});

		it("remembers the username for a bare login -u", async () => {
			loginMock.mockResolvedValue({ token: "jwt-token" });
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			fireEvent.keyDown(passwordInput(), { key: "Escape" });
			type("login -u");
			pressKey("Enter");
			expect(screen.getByText("password:")).toBeInTheDocument();
			fireEvent.change(passwordInput(), { target: { value: "pw" } });
			fireEvent.keyDown(passwordInput(), { key: "Enter" });
			await waitFor(() =>
				expect(loginMock).toHaveBeenCalledWith({
					username: "admin",
					password: "pw",
					remember: false,
				}),
			);
		});

		it("normalizes the username extracted from login -u", async () => {
			loginMock.mockResolvedValue({ token: "t" });
			renderBar();
			type("login -u ADMIN");
			pressKey("Enter");
			fireEvent.change(passwordInput(), { target: { value: "pw" } });
			fireEvent.keyDown(passwordInput(), { key: "Enter" });
			await waitFor(() =>
				expect(loginMock).toHaveBeenCalledWith({
					username: "admin",
					password: "pw",
					remember: false,
				}),
			);
		});

		it("ignores repeated Enter presses while submitting", async () => {
			let resolveLogin: ((value: { token: string }) => void) | undefined;
			loginMock.mockReturnValue(
				new Promise<{ token: string }>((resolve) => {
					resolveLogin = resolve;
				}),
			);
			renderBar();
			type("login -u admin");
			pressKey("Enter");
			const password = passwordInput();
			fireEvent.change(password, { target: { value: "pw" } });
			fireEvent.keyDown(password, { key: "Enter" });
			fireEvent.keyDown(password, { key: "Enter" });
			fireEvent.keyDown(password, { key: "Enter" });
			expect(loginMock).toHaveBeenCalledTimes(1);
			resolveLogin?.({ token: "t" });
			await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin"));
		});

		it("logs out an authed session", () => {
			sessionMock.status = "authed";
			sessionMock.user = { username: "handywote", provider: "github" };
			renderBar();
			type("logout");
			pressKey("Enter");
			expect(sessionMock.logout).toHaveBeenCalled();
			expect(screen.getByText("logged out")).toBeInTheDocument();
		});

		it("reports not logged in for logout as a guest", () => {
			renderBar();
			type("logout");
			pressKey("Enter");
			expect(sessionMock.logout).not.toHaveBeenCalled();
			expect(screen.getByText("not logged in")).toBeInTheDocument();
		});

		it("shows whoami as not logged in for a guest", () => {
			renderBar();
			type("whoami");
			pressKey("Enter");
			expect(screen.getByText("not logged in")).toBeInTheDocument();
		});

		it("shows whoami with the github provider", () => {
			sessionMock.status = "authed";
			sessionMock.user = { username: "handywote", provider: "github" };
			renderBar();
			type("whoami");
			pressKey("Enter");
			expect(screen.getByText("handywote (github)")).toBeInTheDocument();
		});

		it("shows whoami as admin for the password provider", () => {
			sessionMock.status = "authed";
			sessionMock.user = { username: "admin", provider: "password" };
			renderBar();
			type("whoami");
			pressKey("Enter");
			expect(screen.getByText("admin (admin)")).toBeInTheDocument();
		});

		it("lists auth commands in help output", () => {
			renderBar();
			type("help");
			pressKey("Enter");
			expect(
				screen.getByText("login sign in with GitHub"),
			).toBeInTheDocument();
			expect(
				screen.getByText("login -u <user> admin password login"),
			).toBeInTheDocument();
			expect(screen.getByText("logout sign out")).toBeInTheDocument();
			expect(
				screen.getByText("whoami show current user"),
			).toBeInTheDocument();
		});

		it("offers auth commands as tab completion candidates", () => {
			renderBar({ commands: [] });
			type("log");
			const options = screen.getAllByRole("option");
			expect(options).toHaveLength(4);
			expect(options.map((option) => option.textContent)).toEqual([
				"▸login",
				"login github",
				"login -u",
				"logout",
			]);
			pressKey("Tab");
			expect(input()).toHaveValue("login");

			type("who");
			pressKey("Tab");
			expect(input()).toHaveValue("whoami");
		});

		it("reports unknown auth-like commands", () => {
			renderBar();
			type("login google");
			pressKey("Enter");
			expect(
				screen.getByText("command not found: login google"),
			).toBeInTheDocument();
		});
	});
});
