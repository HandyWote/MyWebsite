// frontend/src/stores/articleStore.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import useArticleStore from "./articleStore";

// Mock config/api
vi.mock("@/config/api", () => {
	const adminEndpoints = {
		ARTICLES: "/api/admin/articles",
		ARTICLE_DETAIL: (id) => `/api/admin/articles/${id}`,
		ARTICLE_BATCH_DELETE: "/api/admin/articles/batch-delete",
	};
	return {
		api: {
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
			del: vi.fn(),
			upload: vi.fn(),
		},
		uploadFile: vi.fn(),
		API_ENDPOINTS: {
			PUBLIC: {},
			ADMIN: adminEndpoints,
		},
		default: {
			API_ENDPOINTS: {
				PUBLIC: {},
				ADMIN: adminEndpoints,
			},
		},
	};
});

import { api } from "@/config/api";

describe("articleStore (slim)", () => {
	beforeEach(() => {
		useArticleStore.getState().reset();
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe("初始状态", () => {
		it("应该有正确的初始状态", () => {
			const state = useArticleStore.getState();

			expect(state.articles).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
			expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
		});

	});

	describe("fetchArticles", () => {
		it("应该成功获取文章列表", async () => {
			const mockArticles = [
				{ id: 1, title: "Article 1", tags: "tag1,tag2" },
				{ id: 2, title: "Article 2", tags: ["tag3"] },
			];
			api.get.mockResolvedValueOnce({ articles: mockArticles, total: 2 });

			await act(async () => {
				await useArticleStore.getState().fetchArticles();
			});

			const state = useArticleStore.getState();
			expect(state.articles).toHaveLength(2);
			expect(state.articles[0].tags).toEqual(["tag1", "tag2"]);
			expect(state.articles[1].tags).toEqual(["tag3"]);
			expect(state.pagination.total).toBe(2);
			expect(state.loading).toBe(false);
		});

		it("应该处理获取失败", async () => {
			api.get.mockRejectedValueOnce(new Error("Network error"));

			await act(async () => {
				await useArticleStore.getState().fetchArticles();
			});

			const state = useArticleStore.getState();
			expect(state.articles).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe("Network error");
		});

		it("应该按分页参数拉取对应页的数据", async () => {
			// mock 按请求参数返回不同数据：store 请求第几页，列表就反映第几页内容
			api.get.mockImplementation((url) => {
				const params = new URLSearchParams(url.split("?")[1]);
				if (params.get("page") === "2") {
					return Promise.resolve({
						articles: [{ id: 22, title: "第二页文章", tags: "" }],
						total: 100,
					});
				}
				return Promise.resolve({
					articles: [{ id: 1, title: "第一页文章", tags: "" }],
					total: 100,
				});
			});

			await act(async () => {
				await useArticleStore
					.getState()
					.fetchArticles({ page: 2, perPage: 20, search: "test" });
			});

			const state = useArticleStore.getState();
			expect(state.articles).toEqual([{ id: 22, title: "第二页文章", tags: [] }]);
			expect(state.pagination).toEqual({ page: 2, perPage: 20, total: 100 });
		});

		it("应该按 perPage 和 search 拉取对应的数据", async () => {
			// mock 按 page + per_page + search 三个参数同时分流：
			// store 丢失 per_page 或 search 任一参数，都会落到默认分支，列表断言必红
			api.get.mockImplementation((url) => {
				const params = new URLSearchParams(url.split("?")[1]);
				if (
					params.get("page") === "2" &&
					params.get("per_page") === "50" &&
					params.get("search") === "react"
				) {
					return Promise.resolve({
						articles: [{ id: 77, title: "筛选命中文章", tags: "" }],
						total: 1,
					});
				}
				return Promise.resolve({ articles: [], total: 0 });
			});

			useArticleStore.setState({ pagination: { page: 1, perPage: 50, total: 0 } });

			await act(async () => {
				await useArticleStore
					.getState()
					.fetchArticles({ page: 2, search: "react" });
			});

			const state = useArticleStore.getState();
			expect(state.articles).toEqual([{ id: 77, title: "筛选命中文章", tags: [] }]);
		});
	});

	describe("fetchArticleById", () => {
		it("成功获取详情后应该重置 loading", async () => {
			api.get.mockResolvedValueOnce({ id: 1, title: "Article 1" });

			await act(async () => {
				await useArticleStore.getState().fetchArticleById(1);
			});

			const state = useArticleStore.getState();
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
		});
	});

	describe("createArticle", () => {
		it("应该成功创建文章", async () => {
			const newArticle = { title: "New Article", content: "Content" };
			const createdArticle = { id: 1, ...newArticle };
			api.post.mockResolvedValueOnce(createdArticle);
			api.get.mockResolvedValueOnce({ articles: [createdArticle], total: 1 });

			const result = await act(async () => {
				return await useArticleStore.getState().createArticle(newArticle);
			});

			expect(result).toEqual(createdArticle);
		});
	});

	describe("updateArticle", () => {
		it("应该成功更新文章", async () => {
			const updatedArticle = {
				id: 1,
				title: "New Title",
				content: "New Content",
			};
			api.put.mockResolvedValueOnce(updatedArticle);
			api.get.mockResolvedValueOnce({ articles: [updatedArticle], total: 1 });

			await act(async () => {
				await useArticleStore
					.getState()
					.updateArticle(1, { title: "New Title", content: "New Content" });
			});

			expect(api.get).toHaveBeenCalled();
		});
	});

	describe("deleteArticle", () => {
		it("应该成功删除文章", async () => {
			api.del.mockResolvedValueOnce({});
			api.get.mockResolvedValueOnce({ articles: [], total: 0 });

			await act(async () => {
				await useArticleStore.getState().deleteArticle(1);
			});

			expect(api.get).toHaveBeenCalled();
		});
	});

	describe("batchDeleteArticles", () => {
		it("应该批量删除后刷新列表", async () => {
			useArticleStore.setState({
				articles: [
					{ id: 1, title: "A", tags: [] },
					{ id: 2, title: "B", tags: [] },
					{ id: 3, title: "C", tags: [] },
				],
				pagination: { page: 1, perPage: 10, total: 3 },
			});
			api.post.mockResolvedValueOnce({});
			// 批量删除后 store 重新拉取列表，返回已删空的结果
			api.get.mockResolvedValueOnce({ articles: [], total: 0 });

			await act(async () => {
				await useArticleStore.getState().batchDeleteArticles([1, 2, 3]);
			});

			const state = useArticleStore.getState();
			expect(state.articles).toEqual([]);
			expect(state.pagination.total).toBe(0);
			expect(state.error).toBe(null);
		});
	});

	describe("setPagination", () => {
		it("应该更新分页状态", () => {
			useArticleStore.getState().setPagination({ page: 2, perPage: 25 });

			const state = useArticleStore.getState();
			expect(state.pagination.page).toBe(2);
			expect(state.pagination.perPage).toBe(25);
			expect(state.pagination.total).toBe(0);
		});
	});

	describe("reset", () => {
		it("应该重置所有状态", () => {
			useArticleStore.setState({
				articles: [{ id: 1 }],
				loading: true,
				error: "Some error",
				pagination: { page: 5, perPage: 20, total: 100 },
			});

			useArticleStore.getState().reset();

			const state = useArticleStore.getState();
			expect(state.articles).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
			expect(state.pagination).toEqual({ page: 1, perPage: 10, total: 0 });
		});
	});
});
