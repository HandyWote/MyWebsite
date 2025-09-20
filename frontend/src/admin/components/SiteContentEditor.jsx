import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Divider, CircularProgress, Alert, Snackbar } from '@mui/material';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config/api';

const SiteContentEditor = () => {
  const [siteBlocks, setSiteBlocks] = useState({});
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 获取网站内容块数据
  const fetchSiteBlocks = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl.adminSiteBlocks(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.code === 0) {
        const blocks = {};
        data.data.forEach(block => {
          blocks[block.name] = block.content;
        });
        setSiteBlocks(blocks);
      }
    } catch (error) {
      console.error('获取网站内容块失败:', error);
      setSnackbar({ open: true, message: '获取网站内容块失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteBlocks();
    
    // 初始化WebSocket连接
    const newSocket = io(`${getApiUrl.websocket()}/site_blocks`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',
    });
    
    // 监听网站内容块更新事件
    newSocket.on('site_block_updated', () => {
      console.log('收到网站内容块更新通知，刷新数据...');
      fetchSiteBlocks();
    });
    
    // 监听连接事件
    newSocket.on('connect', () => {
      console.log('WebSocket连接已建立');
    });
    
    newSocket.on('disconnect', () => {
      console.log('WebSocket连接已断开');
    });
    
    setSocket(newSocket);
    
    // 清理函数
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // 保存网站内容块
  const handleSave = async (blockName) => {
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl.adminSiteBlocks(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blocks: [
            { name: blockName, content: siteBlocks[blockName] }
          ]
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSnackbar({ open: true, message: data.msg || '保存成功', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '保存失败', severity: 'error' });
      }
    } catch (error) {
      console.error(`保存${blockName}失败:`, error);
      setSnackbar({ open: true, message: `保存${blockName}失败`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 处理内容变化
  const handleContentChange = (blockName, content) => {
    setSiteBlocks(prev => ({
      ...prev,
      [blockName]: content
    }));
  };

  // 关闭提示消息
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>内容管理</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">首页介绍</Typography>
        <TextField 
          fullWidth 
          multiline 
          minRows={4} 
          sx={{ my: 2 }} 
          label="首页介绍内容"
          value={siteBlocks.home?.desc || ''}
          onChange={(e) => handleContentChange('home', { ...siteBlocks.home, desc: e.target.value })}
        />
        <Button 
          variant="contained" 
          onClick={() => handleSave('home')}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">关于我</Typography>
        <TextField 
          fullWidth 
          multiline 
          minRows={4} 
          sx={{ my: 2 }} 
          label="关于我内容"
          value={siteBlocks.about?.desc || ''}
          onChange={(e) => handleContentChange('about', { ...siteBlocks.about, desc: e.target.value })}
        />
        <Button 
          variant="contained" 
          onClick={() => handleSave('about')}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
    </Box>
  );
};

export default SiteContentEditor;