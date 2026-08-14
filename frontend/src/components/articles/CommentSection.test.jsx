import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommentSection from "./CommentSection";

const { apiGetMock, apiPostMock, sessionMock } = vi.hoisted(() => {
	const session = {
		status: "guest",
		user: null,
		login: vi.fn(),
		logout: vi.fn(),
		refresh: vi.fn(),
	};
	return { apiGetMock: vi.fn(), apiPostMock: vi.fn(), sessionMock: session };
});

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

vi.mock("../../hooks/useSession", () => ({ useSession: () => sessionMock }));

vi.mock("../../hooks/useNotification", () => ({
	default: () => ({
		snackbarOpen: false,
		snackbarMessage: "",
		showNotification: vi.fn(),
		hideNotification: vi.fn(),
	}),
}));

const renderSection = () => render(<CommentSection articleId={7} />);

describe("CommentSection with GitHub identity", () => {
	beforeEach(() => {
		apiGetMock.mockReset().mockResolvedValue({ comments: [] });
		apiPostMock.mockReset().mockResolvedValue({});
		sessionMock.status = "guest";
		sessionMock.user = null;
	});

	it("keeps the manual name input for anonymous guests", async () => {
		renderSection();
		expect(screen.getByLabelText("$ name")).toBeInTheDocument();
	});

	it("hides the name input and shows the GitHub identity for logged-in users", () => {
		sessionMock.status = "authed";
		sessionMock.user = {
			username: "octocat",
			provider: "github",
			display_name: "Octo Cat",
			avatar_url: "https://avatars.example.com/octocat.png",
		};
		renderSection();
		expect(screen.queryByLabelText("$ name")).not.toBeInTheDocument();
		expect(screen.getByText("$ name Octo Cat (github)")).toBeInTheDocument();
	});

	it("posts the GitHub username and avatar link for logged-in users", async () => {
		sessionMock.status = "authed";
		sessionMock.user = {
			username: "octocat",
			provider: "github",
			display_name: "Octo Cat",
			avatar_url: "https://avatars.example.com/octocat.png",
		};
		renderSection();
		fireEvent.change(screen.getByLabelText("$ message"), {
			target: { value: "hello from github" },
		});
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

	it("still posts the manual author for anonymous guests", async () => {
		renderSection();
		fireEvent.change(screen.getByLabelText("$ name"), {
			target: { value: "anon" },
		});
		fireEvent.change(screen.getByLabelText("$ message"), {
			target: { value: "hello" },
		});
		fireEvent.click(screen.getByText("> submit"));

		await waitFor(() => {
			expect(apiPostMock).toHaveBeenCalledWith("/api/articles/7/comments", {
				author: "anon",
				email: "",
				avatar_url: "",
				content: "hello",
			});
		});
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
		const img = document.querySelector('img[src="https://avatars.example.com/octocat.png"]');
		expect(img).not.toBeNull();
		// 无头像的评论仍回退首字母。
		expect(screen.getByText("a")).toBeInTheDocument();
	});
});
