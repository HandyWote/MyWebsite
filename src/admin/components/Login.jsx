import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Card, CardContent, TextField, Button, Typography, 
  Alert, CircularProgress, Checkbox, FormControlLabel, Paper 
} from '@mui/material';
import { getAndClearRedirectPath } from '../utils/auth';
import { getApiUrl } from '../../config/api'; // 导入API配置

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // 显示来自路由状态的消息（如token过期提示）
  const stateMessage = location.state?.message;

  useEffect(() => {
    // 如果已经有token，直接跳转
    const token = localStorage.getItem('token');
    if (token) {
      const redirectPath = getAndClearRedirectPath();
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(getApiUrl.adminLogin(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember })
      });
      
      const data = await res.json();
      
      if (res.ok && data.code === 0 && data.token) {
        localStorage.setItem('token', data.token);
        
        // 登录成功后跳转到原本想访问的页面
        const redirectPath = getAndClearRedirectPath();
        navigate(redirectPath, { replace: true });
      } else {
        setError(data.msg || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
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
        
        {stateMessage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {stateMessage}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label="密码"
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
                />
              }
              label="记住登录状态"
              sx={{ mt: 1, mb: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login; 
