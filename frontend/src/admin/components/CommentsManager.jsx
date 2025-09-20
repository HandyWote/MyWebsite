import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Badge,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Schedule as ScheduleIcon,
  Article as ArticleIcon,
  Person as PersonIcon,
  Public as PublicIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config/api';

// 评论状态枚举
const COMMENT_STATUS = {
  NORMAL: 'normal',
  PENDING: 'pending',
  SPAM: 'spam'
};

// 评论状态配置
const STATUS_CONFIG = {
  [COMMENT_STATUS.NORMAL]: {
    label: '正常',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />
  },
  [COMMENT_STATUS.PENDING]: {
    label: '待审核',
    color: 'warning',
    icon: <ScheduleIcon fontSize="small" />
  },
  [COMMENT_STATUS.SPAM]: {
    label: '垃圾评论',
    color: 'error',
    icon: <BlockIcon fontSize="small" />
  }
};

// 评论卡片组件
function CommentCard({ comment, onView, onDelete, onStatusChange, ...props }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [expanded, setExpanded] = useState(false);
  
  // 确保comment对象存在
  if (!comment) {
    return null;
  }
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleStatusChange = (status) => {
    onStatusChange(comment.id, status);
    handleMenuClose();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-CN');
  };
  
  const statusConfig = comment.status ? STATUS_CONFIG[comment.status] || STATUS_CONFIG.NORMAL : STATUS_CONFIG.NORMAL;
  
  return (
    <Card sx={{ mb: 2, overflow: 'hidden' }} {...props}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {comment.author.charAt(0)}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {comment.author}
              </Typography>
              <Chip
                icon={statusConfig.icon}
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, color: 'text.secondary' }}>
              <Tooltip title="评论时间">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon fontSize="small" />
                  <Typography variant="caption">
                    {formatDate(comment.created_at)}
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title="IP地址">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PublicIcon fontSize="small" />
                  <Typography variant="caption">
                    {comment.ip_address}
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title="所属文章">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ArticleIcon fontSize="small" />
                  <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                    {comment.article_title}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.primary"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: expanded ? 'none' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' }
              }}
              onClick={() => setExpanded(!expanded)}
            >
              {comment.content}
            </Typography>
            
            {comment.email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                邮箱: {comment.email}
              </Typography>
            )}
          </Box>
          
          <Box>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => onView(comment)}>
                <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
                查看详情
              </MenuItem>
              <MenuItem onClick={() => handleStatusChange(COMMENT_STATUS.NORMAL)}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                标记为正常
              </MenuItem>
              <MenuItem onClick={() => handleStatusChange(COMMENT_STATUS.PENDING)}>
                <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
                标记为待审核
              </MenuItem>
              <MenuItem onClick={() => handleStatusChange(COMMENT_STATUS.SPAM)}>
                <BlockIcon fontSize="small" sx={{ mr: 1 }} />
                标记为垃圾评论
              </MenuItem>
              <MenuItem onClick={() => onDelete(comment)} sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                删除评论
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          ID: {comment.id}
        </Typography>
      </CardActions>
    </Card>
  );
}

// 评论详情对话框
function CommentDetailDialog({ comment, open, onClose }) {
  if (!comment) return null;
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-CN');
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>评论详情</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">作者</Typography>
            <Typography variant="body1">{comment.author}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">邮箱</Typography>
            <Typography variant="body1">{comment.email || '未提供'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">IP地址</Typography>
            <Typography variant="body1">{comment.ip_address}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">评论时间</Typography>
            <Typography variant="body1">{formatDate(comment.created_at)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">所属文章</Typography>
            <Typography variant="body1">{comment.article_title}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">评论内容</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>
            </Paper>
          </Grid>
          {comment.user_agent && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">用户代理</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {comment.user_agent}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

const CommentsManager = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComment, setSelectedComment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedComments, setSelectedComments] = useState([]);
  const [socket, setSocket] = useState(null);
  
  // 获取评论列表
  const fetchComments = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`${getApiUrl.adminComments()}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.code === 0) {
        // 确保评论数据有正确的结构
        const comments = (data.data.comments || []).map(comment => ({
          ...comment,
          status: comment.status || 'normal',
          article_title: comment.article_title || '未知文章'
        }));
        setComments(comments);
        setTotal(data.data.total || 0);
      } else {
        setSnackbarMessage(data.msg || '获取评论列表失败');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('获取评论列表失败: ' + error.message);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchComments();
    
    // 初始化WebSocket连接
    const newSocket = io(`${getApiUrl.websocket()}/comments`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',
    });
    
    // 监听评论更新事件
    newSocket.on('comments_updated', () => {
      console.log('收到评论更新通知，刷新数据...');
      fetchComments();
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
  }, [page, perPage, searchTerm, statusFilter]);
  
  // 删除评论
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(getApiUrl.deleteComment(commentToDelete.id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.code === 0) {
        setSnackbarMessage('评论删除成功');
        setSnackbarOpen(true);
        fetchComments();
      } else {
        setSnackbarMessage(data.msg || '删除评论失败');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('删除评论失败: ' + error.message);
      setSnackbarOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };
  
  // 更改评论状态
  const handleStatusChange = async (commentId, status) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${getApiUrl.adminComments()}/${commentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      const data = await response.json();
      if (data.code === 0) {
        setSnackbarMessage('评论状态更新成功');
        setSnackbarOpen(true);
        fetchComments();
      } else {
        setSnackbarMessage(data.msg || '更新评论状态失败');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('更新评论状态失败: ' + error.message);
      setSnackbarOpen(true);
    }
  };
  
  // 导出评论数据
  const handleExport = async () => {
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`${getApiUrl.adminComments()}/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comments_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSnackbarMessage('评论数据导出成功');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('导出失败');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('导出失败: ' + error.message);
      setSnackbarOpen(true);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        评论管理
      </Typography>
      
      {/* 统计信息 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">{total}</Typography>
              <Typography variant="body2" color="text.secondary">总评论数</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.NORMAL).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">正常评论</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.PENDING).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">待审核</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.SPAM).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">垃圾评论</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 搜索和过滤 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="搜索评论内容、作者、IP地址..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                label="状态筛选"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">全部状态</MenuItem>
                <MenuItem value={COMMENT_STATUS.NORMAL}>正常</MenuItem>
                <MenuItem value={COMMENT_STATUS.PENDING}>待审核</MenuItem>
                <MenuItem value={COMMENT_STATUS.SPAM}>垃圾评论</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchComments}
                disabled={loading}
              >
                刷新
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                导出
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 评论列表 */}
      {loading ? (
        <Box textAlign="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Box>
      ) : comments.length > 0 ? (
        <Box>
          {comments.map((comment) => (
            comment && (
              <CommentCard
                key={comment.id}
                comment={comment}
                onView={(comment) => {
                  setSelectedComment(comment);
                  setDetailDialogOpen(true);
                }}
                onDelete={(comment) => {
                  setCommentToDelete(comment);
                  setDeleteDialogOpen(true);
                }}
                onStatusChange={handleStatusChange}
              />
            )
          ))}
          
          {/* 分页 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / perPage)}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            暂无评论数据
          </Typography>
        </Paper>
      )}
      
      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCommentToDelete(null);
        }}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除这条评论吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setCommentToDelete(null);
          }}>
            取消
          </Button>
          <Button onClick={handleDeleteComment} color="error">
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 评论详情对话框 */}
      <CommentDetailDialog
        comment={selectedComment}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedComment(null);
        }}
      />
      
      {/* 提示消息 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default CommentsManager;