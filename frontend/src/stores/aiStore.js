// frontend/src/stores/aiStore.js
import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/config/api';

const {
  ARTICLE_AI_ANALYZE,
  AI_SETTINGS,
  AI_SETTINGS_TEST,
} = API_ENDPOINTS.ADMIN;

const useAiStore = create((set, get) => ({
  aiAnalysis: null,
  aiSuggestions: null,
  aiSettings: null,
  loading: false,
  settingsLoading: false,
  settingsSaving: false,
  settingsTesting: false,

  analyzeContent: async (title, content, summary = '') => {
    set({ loading: true });
    try {
      const result = await api.post(ARTICLE_AI_ANALYZE, {
        title,
        content,
        summary,
      });
      set({ aiAnalysis: result, aiSuggestions: result, loading: false });
      return result;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  fetchAiSettings: async () => {
    set({ settingsLoading: true });
    try {
      const settings = await api.get(AI_SETTINGS);
      set({ aiSettings: settings, settingsLoading: false });
      return settings;
    } catch (err) {
      set({ settingsLoading: false });
      throw err;
    }
  },

  updateAiSettings: async (settings) => {
    set({ settingsSaving: true });
    try {
      const updated = await api.put(AI_SETTINGS, settings);
      set({ aiSettings: updated, settingsSaving: false });
      return updated;
    } catch (err) {
      set({ settingsSaving: false });
      throw err;
    }
  },

  testAiConnection: async (settings) => {
    set({ settingsTesting: true });
    try {
      const result = await api.post(AI_SETTINGS_TEST, settings);
      set({ settingsTesting: false });
      return result;
    } catch (err) {
      set({ settingsTesting: false });
      throw err;
    }
  },

  applySuggestions: () => {
    const { aiSuggestions } = get();
    if (!aiSuggestions) return null;

    const category = (aiSuggestions.category || '').toString().trim();
    const summary = (aiSuggestions.suggested_summary || aiSuggestions.summary || '').toString().trim();

    let tags = [];
    if (Array.isArray(aiSuggestions.tags)) {
      tags = aiSuggestions.tags.map((item) => (item || '').toString().trim()).filter(Boolean);
    } else if (typeof aiSuggestions.tags === 'string') {
      tags = aiSuggestions.tags.split(',').map((item) => item.trim()).filter(Boolean);
    }

    const result = { category, tags, summary };
    set({ aiAnalysis: null, aiSuggestions: null });
    return result;
  },
}));

export default useAiStore;
