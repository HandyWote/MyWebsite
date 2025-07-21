import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { io } from 'socket.io-client';

const WS_NAMESPACE = 'ws://localhost:5000/ws/articles';
const API_PATH = 'http://localhost:5000/api/admin/articles';

const ArticlesManager = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchArticles = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(API_PATH, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    setArticles(data.articles || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
    const socket = io('ws://localhost:5000/articles', {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socket.on('connect', () => {
      console.log('articles ws connected');
    });
    socket.on('message', () => {
      fetchArticles();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchArticles}>手动刷新</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>标题</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles.map(article => (
              <TableRow key={article.id}>
                <TableCell>{article.title}</TableCell>
                <TableCell>{article.category}</TableCell>
                <TableCell>{Array.isArray(article.tags) ? article.tags.join(', ') : article.tags}</TableCell>
                <TableCell>{article.created_at}</TableCell>
                <TableCell>
                  {/* 编辑、删除按钮 */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ArticlesManager; 