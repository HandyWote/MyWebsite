import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const WS_NAMESPACE = 'ws://localhost:5000/ws/recycle-bin';
const API_PATH = '/api/admin/recycle-bin';

const RecycleBin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch(API_PATH);
    const data = await res.json();
    setItems(data.recycle_bin || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    wsRef.current = new WebSocket(WS_NAMESPACE);
    wsRef.current.onmessage = () => {
      fetchItems();
    };
    return () => {
      wsRef.current && wsRef.current.close();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchItems}>手动刷新</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>内容摘要</TableCell>
              <TableCell>删除时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.summary}</TableCell>
                <TableCell>{item.deleted_at}</TableCell>
                <TableCell>
                  <IconButton color="primary"><RestoreIcon /></IconButton>
                  <IconButton color="error"><DeleteForeverIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" color="error" sx={{ mt: 2 }}>清空回收站</Button>
    </Box>
  );
};

export default RecycleBin; 