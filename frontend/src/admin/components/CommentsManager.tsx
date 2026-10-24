import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import {
  Box,
  Stack,
  Typography,
  InputAdornment,
  MenuItem,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PixelButton, PixelConfirmDialog, PixelInput } from '@/components/pixel';
import useCommentStore from '@/stores/commentStore';
import type { Comment } from '@/api/types';
import useNotification from '../../hooks/useNotification';
import { CommentCard, CommentDetailDialog, COMMENT_STATUS } from './comments';
import {
  AdminEmptyState,
  AdminFieldGrid,
  AdminFieldGridItem,
  AdminFormStack,
  AdminPage,
  AdminSection,
  AdminStatsGrid,
} from './ui';

const PER_PAGE = 10;

interface StatItemProps {
  value: number;
  label: string;
  color: string;
}

const StatItem = ({ value, label, color }: StatItemProps) => (
  <AdminFieldGridItem size={{ xs: 12, sm: 3 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" color={color}>{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  </AdminFieldGridItem>
);

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
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 通知：成功/失败是 hook 里 useCallback 出来的稳定引用，可安全放进 handleFetchComments
  // 的依赖数组；若直接依赖 useNotification() 返回的对象（含 open/message），通知一变化
  // 就会重建回调并让下面的 useEffect 重新拉取，失败时形成循环。
  const { success: notifySuccess, error: notifyError } = useNotification();

  // 获取评论列表
  const handleFetchComments = useCallback(async () => {
    try {
      await fetchComments();
    } catch (error) {
      notifyError('获取评论列表失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [fetchComments, notifyError]);

  useEffect(() => {
    handleFetchComments();
  }, [handleFetchComments]);

  // 删除评论
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await deleteComment(commentToDelete.id);
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
      notifySuccess('评论删除成功');
    } catch (error) {
      notifyError('删除评论失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 更改评论状态
  const handleStatusChange = async (commentId: number, status: string) => {
    try {
      await updateCommentStatus(commentId, status);
      notifySuccess('评论状态更新成功');
    } catch (error) {
      notifyError('更新评论状态失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 导出评论数据
  const handleExport = async () => {
    try {
      await exportComments();
      notifySuccess('评论数据导出成功');
    } catch (error) {
      notifyError('导出失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <AdminPage title="评论管理">
      <AdminFormStack spacing={3}>
        {/* 统计信息 */}
        <AdminSection>
          <AdminStatsGrid>
            <StatItem value={total} label="总评论数" color="primary" />
            <StatItem
              value={comments.filter(c => c && c.status === COMMENT_STATUS.NORMAL).length}
              label="正常评论"
              color="success.main"
            />
            <StatItem
              value={comments.filter(c => c && c.status === COMMENT_STATUS.PENDING).length}
              label="待审核"
              color="warning.main"
            />
            <StatItem
              value={comments.filter(c => c && c.status === COMMENT_STATUS.SPAM).length}
              label="垃圾评论"
              color="error.main"
            />
          </AdminStatsGrid>
        </AdminSection>

        {/* 搜索和过滤 */}
        <AdminSection>
          <AdminFieldGrid sx={{ alignItems: 'center' }}>
            <AdminFieldGridItem size={{ xs: 12, sm: 6 }}>
              <PixelInput
                fullWidth
                placeholder="搜索评论内容、作者、IP地址..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </AdminFieldGridItem>
            <AdminFieldGridItem size={{ xs: 12, sm: 3 }}>
              <PixelInput
                fullWidth
                select
                value={statusFilter}
                label="状态筛选"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">全部状态</MenuItem>
                <MenuItem value={COMMENT_STATUS.NORMAL}>正常</MenuItem>
                <MenuItem value={COMMENT_STATUS.PENDING}>待审核</MenuItem>
                <MenuItem value={COMMENT_STATUS.SPAM}>垃圾评论</MenuItem>
              </PixelInput>
            </AdminFieldGridItem>
            <AdminFieldGridItem size={{ xs: 12, sm: 3 }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <PixelButton
                  variant="outline"
                  startIcon={<RefreshIcon />}
                  onClick={handleFetchComments}
                  disabled={loading}
                >
                  刷新
                </PixelButton>
                <PixelButton
                  variant="outline"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                >
                  导出
                </PixelButton>
              </Stack>
            </AdminFieldGridItem>
          </AdminFieldGrid>
        </AdminSection>

        {/* 评论列表 */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : comments.length > 0 ? (
          <Box>
            <AdminFormStack spacing={2}>
              {comments.map((comment) =>
                comment && (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onView={(comment: Comment) => {
                      setSelectedComment(comment);
                      setDetailDialogOpen(true);
                    }}
                    onDelete={(comment: Comment) => {
                      setCommentToDelete(comment);
                      setDeleteDialogOpen(true);
                    }}
                    onStatusChange={handleStatusChange}
                  />
                )
              )}
            </AdminFormStack>

            {/* 分页 */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(total / PER_PAGE)}
                page={page}
                onChange={(_event, newPage: number) => setPage(newPage)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          </Box>
        ) : (
          <AdminEmptyState title="暂无评论数据" />
        )}
      </AdminFormStack>

      {/* 删除确认对话框 */}
      <PixelConfirmDialog
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
    </AdminPage>
  );
}
