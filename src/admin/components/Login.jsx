import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/admin';
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      setError('网络错误');
    }
    setLoading(false);
  };

  return (
    // 外层 Box 只负责背景和居中
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
      }}
    >
      {/* 内容区 Paper 设置响应式宽度 */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: { xs: '90vw', sm: 400, md: 480 },
          maxWidth: 480
        }}
      >
        <Typography variant="h5" align="center" gutterBottom>管理后台登录</Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="用户名"
            fullWidth
            value={username}
            onChange={e => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          <TextField
            label="密码"
            type="password"
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || !username || !password}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login; 