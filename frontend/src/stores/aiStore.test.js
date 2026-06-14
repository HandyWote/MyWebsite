// frontend/src/stores/aiStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useAiStore from './aiStore';

vi.mock('@/config/api', () => {
  const adminEndpoints = {
    ARTICLE_AI_ANALYZE: '/api/admin/articles/ai-analyze',
    AI_SETTINGS: '/api/admin/ai-settings',
    AI_SETTINGS_TEST: '/api/admin/ai-settings/test',
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

import { api } from '@/config/api';

describe('aiStore', () => {
  beforeEach(() => {
    // Reset aiStore state manually
    useAiStore.setState({
      aiAnalysis: null,
      aiSuggestions: null,
      aiSettings: null,
      loading: false,
      settingsLoading: false,
      settingsSaving: false,
      settingsTesting: false,
    });
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useAiStore.getState();
      expect(state.aiAnalysis).toBe(null);
      expect(state.aiSuggestions).toBe(null);
      expect(state.aiSettings).toBe(null);
      expect(state.loading).toBe(false);
      expect(state.settingsLoading).toBe(false);
      expect(state.settingsSaving).toBe(false);
      expect(state.settingsTesting).toBe(false);
    });
  });

  describe('analyzeContent', () => {
    it('应该成功分析内容', async () => {
      const mockAnalysis = {
        category: '技术',
        tags: ['React', 'Zustand'],
        suggested_summary: '这是一篇关于状态管理的文章',
      };
      api.post.mockResolvedValueOnce(mockAnalysis);

      const result = await act(async () => {
        return await useAiStore.getState().analyzeContent('标题', '内容', '摘要');
      });

      const state = useAiStore.getState();
      expect(state.aiAnalysis).toEqual(mockAnalysis);
      expect(state.aiSuggestions).toEqual(mockAnalysis);
      expect(state.loading).toBe(false);
      expect(result).toEqual(mockAnalysis);
    });

    it('应该处理分析失败', async () => {
      api.post.mockRejectedValueOnce(new Error('AI service unavailable'));

      await expect(
        act(async () => {
          await useAiStore.getState().analyzeContent('标题', '内容');
        })
      ).rejects.toThrow('AI service unavailable');

      expect(useAiStore.getState().loading).toBe(false);
    });
  });

  describe('fetchAiSettings', () => {
    it('应该成功获取AI设置', async () => {
      const mockSettings = { model: 'gpt-4', base_url: 'https://api.openai.com' };
      api.get.mockResolvedValueOnce(mockSettings);

      const result = await act(async () => {
        return await useAiStore.getState().fetchAiSettings();
      });

      expect(useAiStore.getState().aiSettings).toEqual(mockSettings);
      expect(result).toEqual(mockSettings);
      expect(useAiStore.getState().settingsLoading).toBe(false);
    });
  });

  describe('updateAiSettings', () => {
    it('应该成功更新AI设置', async () => {
      const updatedSettings = { model: 'gpt-4-turbo', base_url: 'https://api.openai.com' };
      api.put.mockResolvedValueOnce(updatedSettings);

      const result = await act(async () => {
        return await useAiStore.getState().updateAiSettings(updatedSettings);
      });

      expect(useAiStore.getState().aiSettings).toEqual(updatedSettings);
      expect(useAiStore.getState().settingsSaving).toBe(false);
    });
  });

  describe('testAiConnection', () => {
    it('应该成功测试AI连接', async () => {
      api.post.mockResolvedValueOnce({ message: 'Connection successful' });

      const result = await act(async () => {
        return await useAiStore.getState().testAiConnection({ api_key: 'test' });
      });

      expect(result).toEqual({ message: 'Connection successful' });
      expect(useAiStore.getState().settingsTesting).toBe(false);
    });

    it('应该处理连接测试失败', async () => {
      api.post.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        act(async () => {
          await useAiStore.getState().testAiConnection({ api_key: 'bad' });
        })
      ).rejects.toThrow('Connection failed');

      expect(useAiStore.getState().settingsTesting).toBe(false);
    });
  });

  describe('applySuggestions', () => {
    it('应该正确格式化并返回建议', () => {
      useAiStore.setState({
        aiSuggestions: {
          category: '技术',
          tags: ['React', 'Zustand'],
          suggested_summary: '关于状态管理',
        },
      });

      const result = useAiStore.getState().applySuggestions();

      expect(result).toEqual({
        category: '技术',
        tags: ['React', 'Zustand'],
        summary: '关于状态管理',
      });

      // 应该清除 AI 分析状态
      expect(useAiStore.getState().aiAnalysis).toBe(null);
      expect(useAiStore.getState().aiSuggestions).toBe(null);
    });

    it('应该处理字符串格式的 tags', () => {
      useAiStore.setState({
        aiSuggestions: {
          category: '技术',
          tags: 'React,Zustand,TypeScript',
          summary: '关于状态管理',
        },
      });

      const result = useAiStore.getState().applySuggestions();

      expect(result.tags).toEqual(['React', 'Zustand', 'TypeScript']);
    });

    it('没有建议时应返回 null', () => {
      const result = useAiStore.getState().applySuggestions();
      expect(result).toBe(null);
    });
  });
});
