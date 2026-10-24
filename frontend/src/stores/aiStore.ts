// frontend/src/stores/aiStore.ts
import { create } from 'zustand';
import { aiApi } from '@/api/aiApi';
import { withLoading } from '@/api/withLoading';
import type { AiSettings, AiSuggestions } from '@/api/types';

/** applySuggestions 的产出：category/summary 已 trim，tags 已拆成数组并过滤空项。 */
export interface AppliedSuggestions {
  category: string;
  tags: string[];
  summary: string;
}

export interface AiState {
  /** 最近一次 analyzeContent 的原始响应（展示层只用 applySuggestions 的归一化结果）。 */
  aiSuggestions: AiSuggestions | null;
  aiSettings: AiSettings | null;
  /** analyzeContent 进行中。 */
  loading: boolean;
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsTesting: boolean;

  analyzeContent: (title: string, content: string, summary?: string) => Promise<AiSuggestions>;
  fetchAiSettings: () => Promise<AiSettings>;
  updateAiSettings: (settings: AiSettings) => Promise<AiSettings>;
  testAiConnection: (settings: AiSettings) => Promise<unknown>;
  /** 取出并清空 AI 建议；没有建议时返回 null。 */
  applySuggestions: () => AppliedSuggestions | null;
}

const useAiStore = create<AiState>()((set, get) => ({
  aiSuggestions: null,
  aiSettings: null,
  loading: false,
  settingsLoading: false,
  settingsSaving: false,
  settingsTesting: false,

  analyzeContent: async (title, content, summary = '') =>
    withLoading(set, 'loading', null, async () => {
      const result = await aiApi.analyzeContent(title, content, summary);
      set({ aiSuggestions: result });
      return result;
    }),

  fetchAiSettings: async () =>
    withLoading(set, 'settingsLoading', null, async () => {
      const settings = await aiApi.fetchAiSettings();
      set({ aiSettings: settings });
      return settings;
    }),

  updateAiSettings: async (settings) =>
    withLoading(set, 'settingsSaving', null, async () => {
      const updated = await aiApi.updateAiSettings(settings);
      set({ aiSettings: updated });
      return updated;
    }),

  testAiConnection: async (settings) =>
    withLoading(set, 'settingsTesting', null, () => aiApi.testAiConnection(settings)),

  applySuggestions: () => {
    const { aiSuggestions } = get();
    if (!aiSuggestions) return null;

    const category = (aiSuggestions.category || '').toString().trim();
    const summary = (
      aiSuggestions.suggested_summary ||
      aiSuggestions.summary ||
      ''
    )
      .toString()
      .trim();

    let tags: string[] = [];
    if (Array.isArray(aiSuggestions.tags)) {
      tags = aiSuggestions.tags
        .map((item) => (item || '').toString().trim())
        .filter(Boolean);
    } else if (typeof aiSuggestions.tags === 'string') {
      tags = aiSuggestions.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const result: AppliedSuggestions = { category, tags, summary };
    set({ aiSuggestions: null });
    return result;
  },
}));

export default useAiStore;
