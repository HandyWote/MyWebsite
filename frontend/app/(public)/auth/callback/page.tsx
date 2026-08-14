'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { authApi } from '@/api/authApi';
import { useSession } from '@/hooks/useSession';

/**
 * redirect_to 站内路径校验：以 '/' 开头且不以 '//' 开头。
 * 拒绝绝对 URL（https://…）与协议相对 URL（//host），防开放重定向。
 */
function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

// StrictMode 开发模式会 setup→cleanup→setup 双跑 effect：exchange 消费的是一次性
// code，并发第二次请求必然 401。模块级缓存让同一 code 的 exchange 只发一次，
// 两个 effect 运行共享同一个结果 promise（各自 active 守卫决定是否落地）。
// 与 useSession 的 pendingMe 缓存同一模式：settle 后自动失效，避免复用旧结果。
type ExchangeResult = Awaited<ReturnType<typeof authApi.exchange>>;
let inFlightExchange: { code: string; promise: Promise<ExchangeResult> } | null = null;

function requestExchange(code: string): Promise<ExchangeResult> {
  if (inFlightExchange && inFlightExchange.code === code) {
    return inFlightExchange.promise;
  }
  const promise = authApi.exchange(code).finally(() => {
    inFlightExchange = null;
  });
  inFlightExchange = { code, promise };
  return promise;
}

/** error 参数场景下展示提示后自动跳回前的停留时长（按钮可立即跳回）。 */
export const ERROR_REDIRECT_DELAY_MS = 4000;

/** 极简 loading 视图：Suspense fallback 与 exchange 处理中共用。 */
function CallbackLoading() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={40} />
      <Typography
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.875rem',
          color: 'text.muted',
        }}
      >
        signing in…
      </Typography>
    </Box>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();

  const errorParam = searchParams.get('error');
  const code = searchParams.get('code');
  const redirectToParam = searchParams.get('redirect_to');

  const errorFromParams =
    errorParam === 'access_denied'
      ? 'authorization cancelled'
      : errorParam
        ? 'authorization cancelled or failed'
        : null;
  const target = isSafeInternalPath(redirectToParam) ? redirectToParam : '/';

  // exchange 失败提示（ApiError message 或兜底文案）。
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  // 一次性 code 换 JWT → 落地会话 → 跳回来源页。
  // 异步回调中 setState（react-hooks/set-state-in-effect 允许）；
  // active 守卫保证 StrictMode 双调用下 login/replace 只落地一次；
  // requestExchange 缓存保证双跑只发一次网络请求。
  useEffect(() => {
    if (errorParam || !code) return undefined;
    let active = true;

    requestExchange(code)
      .then(({ token, user, redirect_to }) => {
        if (!active) return;
        login(token, user);
        router.replace(isSafeInternalPath(redirect_to) ? redirect_to : '/');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setExchangeError(reason instanceof Error ? reason.message : 'sign-in failed');
      });

    return () => {
      active = false;
    };
  }, [code, errorParam, login, router]);

  // error 参数：短暂停留展示提示后自动跳回（按钮可立即跳）；无参数：直接回首页。
  useEffect(() => {
    if (errorParam) {
      const timer = window.setTimeout(() => router.replace(target), ERROR_REDIRECT_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (!code) {
      router.replace('/');
    }
    return undefined;
  }, [code, errorParam, router, target]);

  const errorMessage = errorFromParams ?? exchangeError;
  if (errorMessage) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          px: 2,
          bgcolor: 'background.default',
        }}
      >
        <Alert
          severity={errorFromParams ? 'warning' : 'error'}
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.875rem',
            bgcolor: 'transparent',
          }}
        >
          {errorMessage}
        </Alert>
        <Button
          type="button"
          variant="outlined"
          sx={{ fontFamily: 'JetBrains Mono, monospace' }}
          onClick={() => router.replace(errorFromParams ? target : '/')}
        >
          back to home
        </Button>
      </Box>
    );
  }

  return <CallbackLoading />;
}

/**
 * GitHub OAuth 回调页：/auth/callback?code=…&redirect_to=…
 *
 * useSearchParams 需要 Suspense 边界（Next 16 预渲染规则），
 * 页面组件默认导出负责挂 Suspense，handler 内部读取参数。
 */
export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackHandler />
    </Suspense>
  );
}
