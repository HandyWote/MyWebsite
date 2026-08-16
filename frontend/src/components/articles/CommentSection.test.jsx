import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentSection from "./CommentSection";
import { ApiError } from "../../config/api";

const { apiGetMock, apiPostMock, sessionMock, notificationMock } = vi.hoisted(
	() => {
		const session = {
			status: "guest",
			user: null,
			login: vi.fn(),
			logout: vi.fn(),
			refresh: vi.fn(),
		};
		return {
			apiGetMock: vi.fn(),
			apiPostMock: vi.fn(),
			sessionMock: session,
			notificationMock: {
				showNotification: vi.fn(),
				hideNotification: vi.fn(),
			},
		};
	},
);

vi.mock("../../config/api", () => ({
	API_ENDPOINTS: {
		PUBLIC: {
			ARTICLE_COMMENTS: (id) => `/api/articles/${id}/comments`,
			CREATE_COMMENT: (id) => `/api/articles/${id}/comments`,
		},
	},
	ApiError: class ApiError extends Error {
		constructor(status, message) {
			super(message);
			this.status = status;
		}
	},
	api: { get: apiGetMock, post: apiPostMock },
}));

vi.mock("../../api/authApi", () => ({
	authApi: {
		buildGithubAuthorizeUrl: (redirectTo) =>
			redirectTo
				? `/api/auth/github/authorize?redirect_to=${encodeURIComponent(redirectTo)}`
				: "/api/auth/github/authorize",
	},
}));

vi.mock("../../hooks/useSession", () => ({ useSession: () => sessionMock }));

vi.mock("../../hooks/useNotification", () => ({
	default: () => ({
		snackbarOpen: false,
		snackbarMessage: "",
		showNotification: notificationMock.showNotification,
		hideNotification: notificationMock.hideNotification,
	}),
}));

const renderSection = (articleId = 7) =>
	render(<CommentSection articleId={articleId} />);

const typeMessage = (value) =>
	fireEvent.change(screen.getByLabelText("$ message"), {
		target: { value },
	});

const githubUser = {
	username: "octocat",
	provider: "github",
	display_name: "Octo Cat",
	avatar_url: "https://avatars.example.com/octocat.png",
};

describe("CommentSection identity rows", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		notificationMock.showNotification.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		window.localStorage.clear();
	});

	it("shows the not-signed-in placeholder for guests and no name input", async () => {
		renderSection();
		expect(screen.getByText("// not signed in")).toBeInTheDocument();
		expect(screen.queryByLabelText("$ name")).not.toBeInTheDocument();
	});

	it("shows the GitHub identity for logged-in users", () => {
		sessionMock.status = "authed";
		sessionMock.user = githubUser;
		renderSection();
		expect(screen.queryByLabelText("$ name")).not.toBeInTheDocument();
		expect(screen.queryByText("// not signed in")).not.toBeInTheDocument();
		expect(screen.getByText("$ name Octo Cat (github)")).toBeInTheDocument();
	});

	it("shows the admin identity for password-provider users", () => {
		sessionMock.status = "authed";
		sessionMock.user = { username: "boss", provider: "password" };
		renderSection();
		expect(screen.queryByLabelText("$ name")).not.toBeInTheDocument();
		expect(screen.getByText("$ name boss (admin)")).toBeInTheDocument();
		// 首字母头像（管理员无头像 URL）
		expect(screen.getByText("b")).toBeInTheDocument();
	});
});

describe("CommentSection sign-in gate", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		notificationMock.showNotification.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		window.localStorage.clear();
		// 静态 location 桩：jsdom 不支持导航，href 赋值仅记录，pathname/search 可控。
		Object.defineProperty(window, "location", {
			writable: true,
			value: { pathname: "/articles/7", search: "", href: "" },
		});
	});

	it("opens the sign-in dialog on guest submit without any request", () => {
		renderSection();
		typeMessage("hello");
		fireEvent.click(screen.getByText("> submit"));

		expect(screen.getByText("sign in required")).toBeInTheDocument();
		expect(
			screen.getByText("comments require sign-in. your draft is saved."),
		).toBeInTheDocument();
		expect(screen.getByText("sign in")).toBeInTheDocument();
		expect(screen.getByText("not now")).toBeInTheDocument();
		expect(apiPostMock).not.toHaveBeenCalled();
	});

	it("keeps submit disabled for guests without content", () => {
		renderSection();
		expect(screen.getByText("> submit")).toBeDisabled();
	});

	it("redirects to GitHub authorize with the current path and flushes the draft", () => {
		renderSection();
		typeMessage("hi");
		fireEvent.click(screen.getByText("> submit"));
		fireEvent.click(screen.getByText("sign in"));

		expect(window.location.href).toBe(
			"/api/auth/github/authorize?redirect_to=%2Farticles%2F7",
		);
		// 跳转前同步落盘：防抖窗口内的输入不丢，登录跳回后原样恢复。
		expect(window.localStorage.getItem("comment:draft:7")).toBe("hi");
	});

	it("closes the dialog with not now", async () => {
		renderSection();
		typeMessage("hello");
		fireEvent.click(screen.getByText("> submit"));
		fireEvent.click(screen.getByText("not now"));
		// 等待 Dialog 退出过渡完成（MUI 延迟卸载）
		await waitFor(() => {
			expect(screen.queryByText("sign in required")).not.toBeInTheDocument();
		});
	});
});

describe("CommentSection submit identity", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		notificationMock.showNotification.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		window.localStorage.clear();
	});

	it("posts the GitHub identity for logged-in users", async () => {
		sessionMock.status = "authed";
		sessionMock.user = githubUser;
		renderSection();
		typeMessage("hello from github");
		fireEvent.click(screen.getByText("> submit"));

		await waitFor(() => {
			expect(apiPostMock).toHaveBeenCalledWith("/api/articles/7/comments", {
				author: "Octo Cat",
				email: "",
				avatar_url: "https://avatars.example.com/octocat.png",
				content: "hello from github",
			});
		});
	});

	it("posts the admin username for password-provider users", async () => {
		sessionMock.status = "authed";
		sessionMock.user = { username: "boss", provider: "password" };
		renderSection();
		typeMessage("hello from admin");
		fireEvent.click(screen.getByText("> submit"));

		await waitFor(() => {
			expect(apiPostMock).toHaveBeenCalledWith("/api/articles/7/comments", {
				author: "boss",
				email: "",
				avatar_url: "",
				content: "hello from admin",
			});
		});
	});

	it("shows the server message when the backend rejects with 401", async () => {
		sessionMock.status = "authed";
		sessionMock.user = githubUser;
		apiPostMock.mockRejectedValue(new ApiError(401, "请先登录后再评论"));
		renderSection();
		typeMessage("stale session");
		fireEvent.click(screen.getByText("> submit"));

		await waitFor(() => {
			expect(notificationMock.showNotification).toHaveBeenCalledWith(
				"请先登录后再评论",
				"warning",
			);
		});
	});
});

describe("CommentSection drafts", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		notificationMock.showNotification.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		window.localStorage.clear();
	});

	it("saves the draft debounced and restores it on mount", async () => {
		const { unmount } = renderSection();
		typeMessage("draft A");
		await waitFor(() => {
			expect(window.localStorage.getItem("comment:draft:7")).toBe("draft A");
		});
		unmount();

		renderSection();
		await waitFor(() => {
			expect(screen.getByLabelText("$ message")).toHaveValue("draft A");
		});
	});

	it("clears the draft after a successful submit", async () => {
		sessionMock.status = "authed";
		sessionMock.user = githubUser;
		renderSection();
		typeMessage("posted!");
		await waitFor(() => {
			expect(window.localStorage.getItem("comment:draft:7")).toBe("posted!");
		});
		fireEvent.click(screen.getByText("> submit"));
		await waitFor(() => {
			expect(window.localStorage.getItem("comment:draft:7")).toBeNull();
		});
	});

	it("isolates drafts per article", async () => {
		const first = renderSection(7);
		typeMessage("draft for 7");
		await waitFor(() => {
			expect(window.localStorage.getItem("comment:draft:7")).toBe(
				"draft for 7",
			);
		});
		first.unmount();

		renderSection(8);
		// 另一篇文章不恢复 7 的草稿
		await waitFor(() => {
			expect(screen.getByLabelText("$ message")).toHaveValue("");
		});
		typeMessage("draft for 8");
		await waitFor(() => {
			expect(window.localStorage.getItem("comment:draft:8")).toBe(
				"draft for 8",
			);
		});
		expect(window.localStorage.getItem("comment:draft:7")).toBe(
			"draft for 7",
		);
	});
});

describe("CommentSection list", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		notificationMock.showNotification.mockReset();
		sessionMock.status = "guest";
		sessionMock.user = null;
		window.localStorage.clear();
	});

	it("renders the GitHub avatar image when a comment has avatar_url", async () => {
		apiGetMock.mockResolvedValue({
			comments: [
				{
					id: 1,
					author: "Octo Cat",
					avatar_url: "https://avatars.example.com/octocat.png",
					content: "hi",
					created_at: "2026-08-01T00:00:00Z",
				},
				{
					id: 2,
					author: "anon",
					content: "yo",
					created_at: "2026-08-02T00:00:00Z",
				},
			],
		});
		renderSection();
		await screen.findByText("hi");
		const img = document.querySelector(
			'img[src="https://avatars.example.com/octocat.png"]',
		);
		expect(img).not.toBeNull();
		// 无头像的评论仍回退首字母。
		expect(screen.getByText("a")).toBeInTheDocument();
	});
});
