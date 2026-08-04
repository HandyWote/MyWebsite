import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  TextField,
  Avatar,
  Divider,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { api, API_ENDPOINTS, ApiError } from '../../config/api';
import { formatDateTime } from '../../utils/formatDate';
import { PixelCard, PixelButton, PixelTypography } from '../pixel';
import useNotification from '../../hooks/useNotification';

/**
 * 文章评论区组件。
 * 从 ArticleDetail 中提取，包含评论表单、评论列表和相关状态管理。
 */
export default function CommentSection({ articleId, demoMode = false }) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const { showNotification, ...snackbarProps } = useNotification();

  const fetchComments = useCallback(async () => {
    if (!articleId || demoMode) return;

    try {
      setCommentsLoading(true);
      const payload = await api.get(API_ENDPOINTS.PUBLIC.ARTICLE_COMMENTS(articleId));
      setComments(payload?.comments || []);
    } catch (error) {
      console.error('获取评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [articleId, demoMode]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentAuthor.trim() || demoMode) return;

    try {
      setSubmittingComment(true);
      await api.post(API_ENDPOINTS.PUBLIC.CREATE_COMMENT(articleId), {
        author: commentAuthor.trim(),
        email: '',
        content: newComment.trim(),
      });

      setNewComment('');
      setCommentAuthor('');
      await fetchComments();
      showNotification('评论发布成功！', 'success');
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        showNotification(error.message || '评论发布频率过高，请稍后再试', 'warning');
      } else {
        console.error('提交评论失败:', error);
        showNotification('评论发布失败，请稍后重试', 'error');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <>
      <PixelCard>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: 'monospace' }}>
          $ comments --list ({comments.length})
        </Typography>

        {/* 发表评论 */}
        <Box sx={{ mb: 4 }}>
          {demoMode && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              演示模式下评论功能不可用，请启动后端服务后重试。
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="$ name"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                disabled={demoMode}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="$ message"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={demoMode}
            sx={{ mb: 2 }}
          />

          <PixelButton
            variant="primary"
            startIcon={<SendIcon />}
            disabled={demoMode || !newComment.trim() || !commentAuthor.trim() || submittingComment}
            onClick={handleSubmitComment}
          >
            {submittingComment ? '> submitting...' : '> submit'}
          </PixelButton>
        </Box>

        <Divider sx={{ mb: 3, borderColor: 'divider' }} />

        {/* 评论列表 */}
        {commentsLoading ? (
          <Box textAlign="center" sx={{ py: 2 }}>
            <Typography color="text.secondary">loading...</Typography>
          </Box>
        ) : comments.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {comments.map((comment) => (
              <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  {comment.author.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                      {comment.author}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(comment.created_at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.6, fontFamily: 'monospace' }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontFamily: 'monospace' }}>
            // no comments yet
          </Typography>
        )}
      </PixelCard>

      <Snackbar
        open={snackbarProps.snackbarOpen}
        autoHideDuration={3000}
        onClose={snackbarProps.hideNotification}
        message={snackbarProps.snackbarMessage}
      />
    </>
  );
}
