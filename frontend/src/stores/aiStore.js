// frontend/src/stores/aiStore.js
import { create } from "zustand";
import { aiApi } from "@/api/aiApi";
import { withLoading } from "@/api/withLoading";

const useAiStore = create((set, get) => ({
	aiSuggestions: null,
	aiSettings: null,
	loading: false,
	settingsLoading: false,
	settingsSaving: false,
	settingsTesting: false,

	analyzeContent: async (title, content, summary = "") =>
		withLoading(set, "loading", null, async () => {
			const result = await aiApi.analyzeContent(title, content, summary);
			set({ aiSuggestions: result });
			return result;
		}),

	fetchAiSettings: async () =>
		withLoading(set, "settingsLoading", null, async () => {
			const settings = await aiApi.fetchAiSettings();
			set({ aiSettings: settings });
			return settings;
		}),

	updateAiSettings: async (settings) =>
		withLoading(set, "settingsSaving", null, async () => {
			const updated = await aiApi.updateAiSettings(settings);
			set({ aiSettings: updated });
			return updated;
		}),

	testAiConnection: async (settings) =>
		withLoading(set, "settingsTesting", null, () =>
			aiApi.testAiConnection(settings)
		),

	applySuggestions: () => {
		const { aiSuggestions } = get();
		if (!aiSuggestions) return null;

		const category = (aiSuggestions.category || "").toString().trim();
		const summary = (
			aiSuggestions.suggested_summary ||
			aiSuggestions.summary ||
			""
		)
			.toString()
			.trim();

		let tags = [];
		if (Array.isArray(aiSuggestions.tags)) {
			tags = aiSuggestions.tags
				.map((item) => (item || "").toString().trim())
				.filter(Boolean);
		} else if (typeof aiSuggestions.tags === "string") {
			tags = aiSuggestions.tags
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
		}

		const result = { category, tags, summary };
		set({ aiSuggestions: null });
		return result;
	},
}));

export default useAiStore;
