import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiSettingsDialog from './AiSettingsDialog';
import type { AiSettings } from '@/api/types';

type MockFn = ReturnType<typeof vi.fn>;

interface AiStoreMockState {
  aiSettings: AiSettings | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsTesting: boolean;
  fetchAiSettings: MockFn;
  updateAiSettings: MockFn;
  testAiConnection: MockFn;
}

const { fetchAiSettings, storeState, useAiStoreMock } = vi.hoisted(() => {
  const fetchSettings = vi.fn();
  const state: AiStoreMockState = {
    aiSettings: null,
    settingsLoading: false,
    settingsSaving: false,
    settingsTesting: false,
    fetchAiSettings: fetchSettings,
    updateAiSettings: vi.fn(),
    testAiConnection: vi.fn(),
  };
  // 组件在 fetch 失败时回落到 useAiStore.getState().aiSettings
  const useStore = Object.assign(vi.fn(() => state), { getState: () => state });
  return { fetchAiSettings: fetchSettings, storeState: state, useAiStoreMock: useStore };
});

vi.mock('@/stores/aiStore', () => ({ default: useAiStoreMock }));
const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../../../hooks/useNotification', () => ({
  default: () => ({
    success: notifySuccess,
    error: notifyError,
    info: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

const initialSettings: AiSettings = {
  prompt: 'Initial prompt',
  model: 'gpt-test',
  base_url: 'https://example.test/v1',
  api_key_masked: 'sk-***',
};

describe('AiSettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.aiSettings = null;
    fetchAiSettings.mockResolvedValue(initialSettings);
  });

  it('fetches settings once for each open transition', async () => {
    const { rerender } = render(<AiSettingsDialog open={false} onClose={vi.fn()} />);

    rerender(<AiSettingsDialog open onClose={vi.fn()} />);
    expect(await screen.findByDisplayValue('Initial prompt')).toBeInTheDocument();
    expect(fetchAiSettings).toHaveBeenCalledTimes(1);

    storeState.aiSettings = { ...initialSettings, prompt: 'Store update' };
    rerender(<AiSettingsDialog open onClose={vi.fn()} />);
    expect(fetchAiSettings).toHaveBeenCalledTimes(1);

    rerender(<AiSettingsDialog open={false} onClose={vi.fn()} />);
    rerender(<AiSettingsDialog open onClose={vi.fn()} />);
    await waitFor(() => expect(fetchAiSettings).toHaveBeenCalledTimes(2));
  });

  it('notifies success through the flat notification API after saving', async () => {
    storeState.updateAiSettings = vi.fn().mockResolvedValue({});
    render(<AiSettingsDialog open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('AI 设置保存成功'));
  });

  it('does not reset edited input when the store updates while open', async () => {
    const { rerender } = render(<AiSettingsDialog open onClose={vi.fn()} />);
    const promptInput = await screen.findByLabelText('提示词');

    fireEvent.change(promptInput, { target: { value: 'Locally edited prompt' } });
    storeState.aiSettings = { ...initialSettings, prompt: 'New store prompt' };
    rerender(<AiSettingsDialog open onClose={vi.fn()} />);

    expect(screen.getByLabelText('提示词')).toHaveValue('Locally edited prompt');
    expect(fetchAiSettings).toHaveBeenCalledTimes(1);
  });
});
