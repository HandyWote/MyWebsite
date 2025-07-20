import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const Login = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // TODO: 调用API登录
    setTimeout(() => {
      setLoading(false);
      // 登录成功后跳转 /admin
      window.location.href = '/admin';
    }, 1000);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
      <Paper elevation={3} sx={{ p: 4, minWidth: 320 }}>
        <Typography variant="h5" align="center" gutterBottom>管理后台登录</Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="密码"
            type="password"
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || !password}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login; 