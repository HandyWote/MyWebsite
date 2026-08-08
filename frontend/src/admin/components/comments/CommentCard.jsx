import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Schedule as ScheduleIcon,
  Article as ArticleIcon,
  Public as PublicIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDateTime } from '../../../utils/formatDate';

// 评论状态枚举
export const COMMENT_STATUS = {
  NORMAL: 'normal',
  PENDING: 'pending',
  SPAM: 'spam',
};

// 评论状态配置
const STATUS_CONFIG = {
  [COMMENT_STATUS.NORMAL]: {
    label: '正常',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
  },
  [COMMENT_STATUS.PENDING]: {
    label: '待审核',
    color: 'warning',
    icon: <ScheduleIcon fontSize="small" />,
  },
  [COMMENT_STATUS.SPAM]: {
    label: '垃圾评论',
    color: 'error',
    icon: <BlockIcon fontSize="small" />,
  },
};

export const getCommentStatusConfig = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG[COMMENT_STATUS.NORMAL];

/**
 * CommentCard - 单条评论卡片
 * 纯展示 + 交互组件，通过 props 接收数据和回调。
 */
export default function CommentCard({ comment, onView, onDelete, onStatusChange, ...props }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (!comment) return null;

  const statusConfig = getCommentStatusConfig(comment.status);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleStatusChange = (status) => {
    onStatusChange(comment.id, status);
    handleMenuClose();
  };

  const formatDate = (dateString) => formatDateTime(dateString);

  return (
    <Card sx={{ overflow: 'hidden' }} {...props}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {comment.author.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, color: 'text.secondary', flexWrap: 'wrap' }}>
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
                '&:hover': { color: 'primary.main' },
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
