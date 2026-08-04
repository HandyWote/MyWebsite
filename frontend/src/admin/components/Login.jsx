'use client';

// Login组件 - Terminal Aesthetics 风格
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Typography,
  Alert, Checkbox, FormControlLabel
} from '@mui/material';
import { getAndClearRedirectPath } from '../utils/auth';
import { authApi } from '../../api/authApi';
import { PixelCard, PixelButton, PixelInput } from '../../components/pixel';
import { colors, typography } from '../../components/pixel/tokens';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  const stateMessage = searchParams.get('message');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const redirectPath = getAndClearRedirectPath();
      router.replace(redirectPath);
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = await authApi.login({ username, password, remember });
      if (!payload?.token) {
        throw new Error('登录响应缺少 token');
      }
      localStorage.setItem('token', payload.token);
      const redirectPath = getAndClearRedirectPath();
      router.replace(redirectPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ width: { xs: '90vw', sm: 400, md: 480 }, maxWidth: 480 }}>
        {/* Terminal Header */}
        <Box className="terminal-header" sx={{ mb: 2 }}>
          admin login
        </Box>

        <PixelCard title="Admin Login" accentLine>
          {stateMessage && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: 0,
                bgcolor: 'transparent',
                color: colors.status.warning,
                border: `1px solid ${colors.status.warning}`,
              }}
            >
              {stateMessage}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 0,
                bgcolor: 'transparent',
                color: colors.status.error,
                border: `1px solid ${colors.status.error}`,
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <PixelInput
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <PixelInput
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                  sx={{
                    color: colors.text.secondary,
                    '&.Mui-checked': {
                      color: colors.accent.blue,
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Remember me
                </Typography>
              }
              sx={{ mt: 1, mb: 2 }}
            />
            <PixelButton
              type="submit"
              fullWidth
              variant="primary"
              disabled={loading}
              sx={{ height: 48 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </PixelButton>
          </form>
        </PixelCard>
      </Box>
    </Box>
  );
};

export default Login;
