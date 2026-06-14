import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Grid2,
  MenuItem,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import useCommentStore from '@/stores/commentStore';
import useNotification from '../../hooks/useNotification';
import { CommentCard, CommentDetailDialog, COMMENT_STATUS } from './comments';
import { ConfirmDialog } from './shared';

const PER_PAGE = 10;

/**
 * CommentsManager - 评论管理页面编排器
 * 职责：UI 状态管理、子组件组合、事件协调。
 * 数据状态已迁移到 commentStore，仅保留 UI 交互状态。
 */
export default function CommentsManager() {
  // Store 数据状态
  const {
    comments,
    total,
    page,
    searchTerm,
    statusFilter,
    loading,
    fetchComments,
    deleteComment,
    updateCommentStatus,
    exportComments,
    setPage,
    setSearchTerm,
    setStatusFilter,
  } = useCommentStore();

  // UI 状态（保留在组件内）
  const [selectedComment, setSelectedComment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 通知
  const notify = useNotification();

  // 获取评论列表
  const handleFetchComments = useCallback(async () => {
    try {
      await fetchComments();
    } catch (error) {
      notify.notify().error('获取评论列表失败: ' + error.message);
    }
  }, [fetchComments]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    handleFetchComments();
  }, [handleFetchComments]);

  // 删除评论
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await deleteComment(commentToDelete.id);
      notify.notify().success('评论删除成功');
    } catch (error) {
      notify.notify().error('删除评论失败: ' + error.message);
    }
  };

  // 更改评论状态
  const handleStatusChange = async (commentId, status) => {
    try {
      await updateCommentStatus(commentId, status);
      notify.notify().success('评论状态更新成功');
    } catch (error) {
      notify.notify().error('更新评论状态失败: ' + error.message);
    }
  };

  // 导出评论数据
  const handleExport = async () => {
    try {
      await exportComments();
      notify.notify().success('评论数据导出成功');
    } catch (error) {
      notify.notify().error('导出失败: ' + error.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        评论管理
      </Typography>

      {/* 统计信息 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">{total}</Typography>
              <Typography variant="body2" color="text.secondary">总评论数</Typography>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.NORMAL).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">正常评论</Typography>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.PENDING).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">待审核</Typography>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {comments.filter(c => c && c.status === COMMENT_STATUS.SPAM).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">垃圾评论</Typography>
            </Box>
          </Grid2>
        </Grid2>
      </Paper>

      {/* 搜索和过滤 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid2 container spacing={2} alignItems="center">
          <Grid2 size={{ xs: 12, sm: 6 }}>
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
                ),
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
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
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleFetchComments}
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
          </Grid2>
        </Grid2>
      </Paper>

      {/* 评论列表 */}
      {loading ? (
        <Box textAlign="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Box>
      ) : comments.length > 0 ? (
        <Box>
          {comments.map((comment) =>
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
          )}

          {/* 分页 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / PER_PAGE)}
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
      <ConfirmDialog
        open={deleteDialogOpen}
        title="确认删除"
        message="确定要删除这条评论吗？此操作不可撤销。"
        confirmText="确认删除"
        severity="error"
        onConfirm={handleDeleteComment}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setCommentToDelete(null);
        }}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCommentToDelete(null);
        }}
      />

      {/* 评论详情对话框 */}
      <CommentDetailDialog
        comment={selectedComment}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedComment(null);
        }}
      />
    </Container>
  );
}
