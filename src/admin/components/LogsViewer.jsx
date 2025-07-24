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
  TablePagination,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Stack,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import moment from 'moment';

const API_PATH = 'http://localhost:5000/api/admin/logs';

const LogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: ''
  });

  // 拉取日志数据
  const fetchLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // 构造查询参数
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('per_page', perPage);
    
    // 添加筛选条件
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    
    try {
      const res = await fetch(`${API_PATH}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.code === 0) {
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, perPage]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    setPage(1); // 重置到第一页
    fetchLogs();
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage + 1);
  };

  const handleChangeRowsPerPage = (event) => {
    setPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>操作日志</Typography>
      
      {/* 筛选区域 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="end">
          <TextField
            label="操作类型"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            size="small"
          />
          
          <TextField
            label="开始时间"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          
          <TextField
            label="结束时间"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          
          <Button variant="contained" onClick={handleSearch}>搜索</Button>
          <IconButton onClick={handleRefresh} title="刷新">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Paper>
      
      {/* 日志表格 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>操作者</TableCell>
                <TableCell>操作类型</TableCell>
                <TableCell>操作对象</TableCell>
                <TableCell>详情</TableCell>
                <TableCell>IP地址</TableCell>
                <TableCell>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.operator}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.target}</TableCell>
                  <TableCell>{log.detail}</TableCell>
                  <TableCell>{log.ip}</TableCell>
                  <TableCell>{moment(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    暂无日志数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={perPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数:"
        />
      </Paper>
    </Container>
  );
};

export default LogsViewer;