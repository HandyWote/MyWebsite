import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/browser';
import CallbackPage, { ERROR_REDIRECT_DELAY_MS } from './page';

const { replaceMock, searchParamsMock, exchangeMock, loginMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
  exchangeMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

vi.mock('@/api/authApi', () => ({
  authApi: { exchange: exchangeMock },
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ login: loginMock }),
}));

const USER = {
  username: 'octocat',
  provider: 'github',
  avatar_url: 'https://avatars.example/octocat.png',
};

function renderWithParams(query: string, options?: { strict?: boolean }) {
  searchParamsMock.mockReturnValue(new URLSearchParams(query));
  const tree = options?.strict ? (
    <StrictMode>
      <CallbackPage />
    </StrictMode>
  ) : (
    <CallbackPage />
  );
  return render(tree);
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    replaceMock.mockReset();
    searchParamsMock.mockReset();
    exchangeMock.mockReset();
    loginMock.mockReset();
  });

  it('error=access_denied 显示授权取消提示，且不调用 exchange', () => {
    renderWithParams('error=access_denied');
    expect(screen.getByText('authorization cancelled')).toBeInTheDocument();
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it('其他 error 显示授权取消或失败提示，按钮跳回首页', async () => {
    const user = userEvent.setup();
    renderWithParams('error=other');
    expect(screen.getByText('authorization cancelled or failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to home/i }));
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('error + 站内 redirect_to 时按钮跳回 redirect_to', async () => {
    const user = userEvent.setup();
    renderWithParams('error=access_denied&redirect_to=/articles');

    await user.click(screen.getByRole('button', { name: /back to home/i }));
    expect(replaceMock).toHaveBeenCalledWith('/articles');
  });

  it('error 展示数秒后自动跳回（redirect_to 站内路径优先）', () => {
    vi.useFakeTimers();
    renderWithParams('error=access_denied&redirect_to=/articles');
    expect(screen.getByText('authorization cancelled')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(ERROR_REDIRECT_DELAY_MS + 1);
    });
    expect(replaceMock).toHaveBeenCalledWith('/articles');
  });

  it('无参数时直接跳回首页', () => {
    renderWithParams('');
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it('code 处理期间显示极简 loading 页', async () => {
    let resolveExchange:
      | ((value: {
          token: string;
          user: typeof USER;
          redirect_to: string;
        }) => void)
      | undefined;
    exchangeMock.mockReturnValue(
      new Promise((resolve) => {
        resolveExchange = resolve;
      }),
    );
    renderWithParams('code=abc');

    expect(screen.getByText('signing in…')).toBeInTheDocument();
    expect(exchangeMock).toHaveBeenCalledWith('abc');
    expect(loginMock).not.toHaveBeenCalled();

    // 收尾 resolve：requestExchange 的模块级一次性 code 缓存 settle 后清空，
    // 避免永不落定的 promise 污染后续测试（同一 code 会命中缓存）。
    resolveExchange?.({ token: 'jwt-1', user: USER, redirect_to: '/articles' });
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('jwt-1', USER));
  });

  it('code 成功：login 落地会话并跳转站内 redirect_to', async () => {
    exchangeMock.mockResolvedValue({ token: 'jwt-1', user: USER, redirect_to: '/articles' });
    renderWithParams('code=abc');

    await waitFor(() => expect(exchangeMock).toHaveBeenCalledWith('abc'));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('jwt-1', USER));
    expect(replaceMock).toHaveBeenCalledWith('/articles');
  });

  it('code 成功但 exchange 未返回 redirect_to 时跳首页', async () => {
    exchangeMock.mockResolvedValue({ token: 'jwt-1', user: USER });
    renderWithParams('code=abc');

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('非法 redirect_to（绝对 URL / 协议相对 URL）回退首页', async () => {
    exchangeMock.mockResolvedValue({ token: 'jwt-1', user: USER, redirect_to: '//evil.example.com' });
    renderWithParams('code=abc&redirect_to=https://evil.example.com');

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('code 失败：显示错误提示并可回首页', async () => {
    const user = userEvent.setup();
    exchangeMock.mockRejectedValue(new ApiError(401, 'invalid code'));
    renderWithParams('code=bad');

    expect(await screen.findByText('invalid code')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to home/i }));
    expect(replaceMock).toHaveBeenCalledWith('/');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('StrictMode 双调用下 login/replace 只落地一次', async () => {
    exchangeMock.mockResolvedValue({ token: 'jwt-1', user: USER, redirect_to: '/projects' });
    renderWithParams('code=abc', { strict: true });

    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock).toHaveBeenCalledWith('jwt-1', USER);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/projects');
  });
});
