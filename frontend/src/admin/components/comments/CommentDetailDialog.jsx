import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Grid,
} from '@mui/material';
import { formatDateTime } from '../../../utils/formatDate';

/**
 * CommentDetailDialog - 评论详情对话框
 * 纯展示组件，接收 comment 数据和 onClose 回调。
 */
export default function CommentDetailDialog({ comment, open, onClose }) {
  if (!comment) return null;

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
            <Typography variant="body1">{formatDateTime(comment.created_at)}</Typography>
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
