import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './Login';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  useNavigate: () => navigateMock,
}));

vi.mock('../utils/auth', () => ({
  getAndClearRedirectPath: () => '/admin',
}));

describe('Admin Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem.mockReturnValue(null);
  });

  it('支持后端 code/data 包装格式并在登录成功后保存 token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          token: 'test-token',
          user: { username: 'admin' },
        },
      }),
    });

    render(<Login />);

    const usernameInput = document.querySelector('input[type="text"]');
    const passwordInput = document.querySelector('input[type="password"]');

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(navigateMock).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });
});
