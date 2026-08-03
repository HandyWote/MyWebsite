// frontend/src/stores/articleStore.js
import { create } from "zustand";
import { api, API_ENDPOINTS } from "@/config/api";
import { normalizeTags } from "@/utils/normalizeTags";

// 从 ADMIN 端点中解构，保持 store 内部代码简洁
const { ARTICLES, ARTICLE_DETAIL, ARTICLE_BATCH_DELETE } = API_ENDPOINTS.ADMIN;

const useArticleStore = create((set, get) => ({
	// ========== 文章列表状态 ==========
	articles: [],
	loading: false,
	error: null,
	pagination: {
		page: 1,
		perPage: 10,
		total: 0,
	},

	// ========== 文章 CRUD ==========
	fetchArticles: async (params = {}) => {
		const { pagination } = get();
		const page = params.page ?? pagination.page;
		const perPage = params.perPage ?? pagination.perPage;
		const search = params.search ?? "";

		set({ loading: true, error: null });
		try {
			const query = new URLSearchParams({
				page,
				per_page: perPage,
				search,
			}).toString();
			const data = await api.get(`${ARTICLES}?${query}`);

			// apiClient 自动解包了 data.data
			const articles = data.articles || [];
			const total = data.total || 0;

			set({
				articles: articles.map((article) => ({
					...article,
					tags: normalizeTags(article.tags),
				})),
				pagination: { ...pagination, page, perPage, total },
				loading: false,
			});
		} catch (err) {
			set({ error: err.message, loading: false });
		}
	},

	fetchArticleById: async (id) => {
		set({ loading: true, error: null });
		try {
			const article = await api.get(ARTICLE_DETAIL(id));
			return article;
		} catch (err) {
			set({ error: err.message });
			throw err;
		} finally {
			set({ loading: false });
		}
	},

	createArticle: async (article) => {
		set({ loading: true, error: null });
		try {
			const data = await api.post(ARTICLES, article);
			get().fetchArticles();
			return data;
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	updateArticle: async (id, article) => {
		set({ loading: true, error: null });
		try {
			const data = await api.put(ARTICLE_DETAIL(id), article);
			get().fetchArticles();
			return data;
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	deleteArticle: async (id) => {
		set({ loading: true, error: null });
		try {
			await api.del(ARTICLE_DETAIL(id));
			get().fetchArticles();
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	batchDeleteArticles: async (ids) => {
		set({ loading: true, error: null });
		try {
			await api.post(ARTICLE_BATCH_DELETE, { ids });
			get().fetchArticles();
		} catch (err) {
			set({ error: err.message, loading: false });
			throw err;
		}
	},

	// ========== SEO 数据注入 ==========
	/**
	 * 从 Go SEO 模板注入的 __INITIAL_DATA__ 读取文章数据。
	 * 如果存在初始数据，直接注入 store，跳过 API 调用。
	 */
	injectInitialData: () => {
		const el = document.getElementById("__INITIAL_DATA__");
		if (!el) return null;

		try {
			const article = JSON.parse(el.textContent);
			el.remove();
			return article;
		} catch (e) {
			console.error("[SEO] 解析 __INITIAL_DATA__ 失败:", e);
			return null;
		}
	},

	// ========== 工具方法 ==========
	setPagination: (updates) =>
		set((state) => ({
			pagination: { ...state.pagination, ...updates },
		})),

	reset: () =>
		set({
			articles: [],
			loading: false,
			error: null,
			pagination: { page: 1, perPage: 10, total: 0 },
		}),
}));

export default useArticleStore;
