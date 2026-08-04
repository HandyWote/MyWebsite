import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './Login';
import { authApi } from '../../api/authApi';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../api/authApi', () => ({
  authApi: { login: vi.fn() },
}));

vi.mock('../utils/auth', () => ({
  getAndClearRedirectPath: () => '/admin',
}));

describe('Admin Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem.mockReturnValue(null);
  });

  it('通过 auth 领域 API 登录并保存 localStorage token', async () => {
    authApi.login.mockResolvedValue({ token: 'test-token' });
    render(<Login />);

    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'admin' } });
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /登录|Login/ }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ username: 'admin', password: '123456', remember: false });
      expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(replaceMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('登录输入框空态标签保持垂直居中', () => {
    render(<Login />);
    const usernameLabel = screen.getByText('Username');
    const usernameInput = document.querySelector('input[type="text"]');

    expect(usernameLabel).not.toHaveClass('MuiInputLabel-shrink');
    expect(usernameInput.closest('.MuiOutlinedInput-root')).toHaveStyle({ minHeight: '44px' });
    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    expect(usernameLabel).toHaveClass('MuiInputLabel-shrink');
  });
});
