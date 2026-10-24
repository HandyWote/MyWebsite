import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiSettingsDialog from './AiSettingsDialog';

const { fetchAiSettings, storeState, useAiStoreMock } = vi.hoisted(() => {
  const fetchSettings = vi.fn();
  const state = {
    aiSettings: null,
    settingsLoading: false,
    settingsSaving: false,
    settingsTesting: false,
    fetchAiSettings: fetchSettings,
    updateAiSettings: vi.fn(),
    testAiConnection: vi.fn(),
  };
  const useStore = vi.fn(() => state);
  useStore.getState = () => state;
  return { fetchAiSettings: fetchSettings, storeState: state, useAiStoreMock: useStore };
});

vi.mock('@/stores/aiStore', () => ({ default: useAiStoreMock }));
vi.mock('../../../hooks/useNotification', () => ({
  default: () => ({ notify: () => ({ success: vi.fn(), error: vi.fn() }) }),
}));

const initialSettings = {
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
