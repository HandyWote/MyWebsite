import { Typography, Paper, Grid } from '@mui/material';
import { PixelButton, PixelDialog } from '@/components/pixel';
import type { Comment } from '@/api/types';
import { formatDateTime } from '../../../utils/formatDate';

export interface CommentDetailDialogProps {
  /** 当前选中的评论；未选中（null）时不渲染。 */
  comment: Comment | null;
  open: boolean;
  onClose: () => void;
}

/**
 * CommentDetailDialog - 评论详情对话框
 * 纯展示组件，接收 comment 数据和 onClose 回调。
 * 容器用 PixelDialog（终端风格：直角、实线边框、mono 标题），关闭按钮用 PixelButton；
 * “关闭”的点击语义不变。
 */
export default function CommentDetailDialog({ comment, open, onClose }: CommentDetailDialogProps) {
  if (!comment) return null;

  return (
    <PixelDialog
      open={open}
      onClose={onClose}
      title="评论详情"
      maxWidth="md"
      fullWidth
      actions={(
        <PixelButton variant="outline" onClick={onClose}>
          关闭
        </PixelButton>
      )}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">作者</Typography>
          <Typography variant="body1">{comment.author}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">邮箱</Typography>
          <Typography variant="body1">{comment.email || '未提供'}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">IP地址</Typography>
          <Typography variant="body1">{comment.ip_address}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" color="text.secondary">评论时间</Typography>
          <Typography variant="body1">{formatDateTime(comment.created_at ?? '')}</Typography>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="text.secondary">所属文章</Typography>
          <Typography variant="body1">{comment.article_title}</Typography>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" color="text.secondary">评论内容</Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
            <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Typography>
          </Paper>
        </Grid>
        {comment.user_agent && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary">用户代理</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {comment.user_agent}
            </Typography>
          </Grid>
        )}
      </Grid>
    </PixelDialog>
  );
}
