import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Stack,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import RefreshIcon from '@mui/icons-material/Refresh';
import moment from 'moment';

const API_PATH = 'http://localhost:5000/api/admin/recycle-bin';

const RecycleBin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [restoreItemId, setRestoreItemId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 拉取回收站数据
  const fetchItems = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(API_PATH, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.code === 0) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('获取回收站数据失败:', error);
      showSnackbar('获取回收站数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleRefresh = () => {
    fetchItems();
  };

  const handleDelete = (itemId) => {
    setDeleteItemId(itemId);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_PATH}/${deleteItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.code === 0) {
        showSnackbar('删除成功');
        fetchItems();
      } else {
        showSnackbar('删除失败: ' + data.msg, 'error');
      }
    } catch (error) {
      console.error('删除失败:', error);
      showSnackbar('删除失败', 'error');
    } finally {
      setDeleteItemId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteItemId(null);
  };

  const handleRestore = (itemId) => {
    setRestoreItemId(itemId);
  };

  const confirmRestore = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_PATH}/${restoreItemId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.code === 0) {
        showSnackbar('恢复成功');
        fetchItems();
      } else {
        showSnackbar('恢复失败: ' + data.msg, 'error');
      }
    } catch (error) {
      console.error('恢复失败:', error);
      showSnackbar('恢复失败', 'error');
    } finally {
      setRestoreItemId(null);
    }
  };

  const cancelRestore = () => {
    setRestoreItemId(null);
  };

  const getTypeName = (type) => {
    const typeMap = {
      'skill': '技能',
      'contact': '联系方式',
      'article': '文章',
      'avatar': '头像',
      'site_block': '站点内容'
    };
    return typeMap[type] || type;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>回收站</Typography>
      
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleRefresh} 
          disabled={loading}
          startIcon={<RefreshIcon />}
        >
          刷新
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleSelectAll}
          disabled={loading || items.length === 0}
        >
          {selectedItems.length === items.length && items.length > 0 ? '取消全选' : '全选'}
        </Button>
      </Stack>
      
      {/* 回收站表格 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>数据类型</TableCell>
                <TableCell>数据ID</TableCell>
                <TableCell>数据内容</TableCell>
                <TableCell>删除时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow 
                  key={item.id} 
                  hover
                  selected={selectedItems.includes(item.id)}
                >
                  <TableCell>{getTypeName(item.data_type)}</TableCell>
                  <TableCell>{item.data_id}</TableCell>
                  <TableCell>
                    {typeof item.data_json === 'object' 
                      ? item.data_json.name || item.data_json.title || JSON.stringify(item.data_json).substring(0, 50) + '...'
                      : String(item.data_json).substring(0, 50) + '...'}
                  </TableCell>
                  <TableCell>{moment(item.deleted_at).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => handleRestore(item.id)}
                        title="恢复"
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => handleDelete(item.id)}
                        title="彻底删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    回收站为空
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* 删除确认对话框 */}
      <Dialog open={!!deleteItemId} onClose={cancelDelete}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要彻底删除这条数据吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>取消</Button>
          <Button onClick={confirmDelete} color="error">确认删除</Button>
        </DialogActions>
      </Dialog>
      
      {/* 恢复确认对话框 */}
      <Dialog open={!!restoreItemId} onClose={cancelRestore}>
        <DialogTitle>确认恢复</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要恢复这条数据吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelRestore}>取消</Button>
          <Button onClick={confirmRestore} color="primary">确认恢复</Button>
        </DialogActions>
      </Dialog>
      
      {/* 提示信息 */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RecycleBin;