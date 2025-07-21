import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { io } from 'socket.io-client';

const WS_NAMESPACE = 'ws://localhost:5000/ws/logs';
const API_PATH = 'http://localhost:5000/api/admin/logs';

const LogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(API_PATH, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const socket = io('ws://localhost:5000/logs', {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socket.on('connect', () => {
      console.log('logs ws connected');
    });
    socket.on('message', () => {
      fetchLogs();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchLogs}>手动刷新</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>操作人</TableCell>
              <TableCell>时间</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>详情</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.time}</TableCell>
                <TableCell>{log.type}</TableCell>
                <TableCell>{log.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LogsViewer; 