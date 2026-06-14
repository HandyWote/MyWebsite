import { useState, useEffect } from 'react';
import { Box, Button, Avatar, Paper, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useAvatarStore from '@/stores/avatarStore';
import useNotification from '../../hooks/useNotification';
import { colors } from '../../components/pixel/tokens';

function SortableAvatarCard({ avatar, index, onDelete, onSetCurrent, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: avatar.id });
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleDelete = () => {
    handleMenuClose();
    onDelete(avatar.id);
  };

  const isCurrent = Boolean(avatar.is_current);

  return (
    <Card ref={setNodeRef} sx={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      mb: 2,
      border: `1px dashed ${colors.border.default}`,
      '&:hover': {
        border: `1px solid ${colors.accent.blue}`,
        borderStyle: 'solid',
      },
    }} {...props}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 拖拽区域 + 头像 */}
          <Box {...attributes} {...listeners} sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
            <Avatar
              src={avatar.url || undefined}
              sx={{ width: 64, height: 64, border: isCurrent ? `3px solid ${colors.accent.blue}` : 'none' }}
            />
          </Box>

          {/* 信息区 */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: isCurrent ? 700 : 400, color: isCurrent ? colors.accent.blue : 'text.secondary' }}>
              {isCurrent ? '当前头像' : `头像 ${index + 1}`}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {avatar.uploaded_at ? new Date(avatar.uploaded_at).toLocaleString() : ''}
            </Typography>
          </Box>

          {/* 菜单按钮 */}
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              删除头像
            </MenuItem>
          </Menu>
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1, bgcolor: 'action.hover', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          ID: {avatar.id}
        </Typography>
        <Button
          size="small"
          variant={isCurrent ? 'contained' : 'outlined'}
          disabled={isCurrent}
          onClick={() => onSetCurrent(avatar.id)}
        >
          {isCurrent ? '当前头像' : '设为当前头像'}
        </Button>
      </CardActions>
    </Card>
  );
}

export default function AvatarsManager() {
  // Store 数据状态
  const {
    avatars,
    loading,
    fetchAvatars,
    uploadAvatar,
    deleteAvatar,
    setCurrent,
    reorderAvatars,
  } = useAvatarStore();

  const notify = useNotification();
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetchAvatars();
  }, []);

  // 拖拽排序
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    if (active.id !== over.id) {
      const oldIndex = avatars.findIndex(a => a.id === active.id);
      const newIndex = avatars.findIndex(a => a.id === over.id);
      const newAvatars = arrayMove(avatars, oldIndex, newIndex);

      try {
        await reorderAvatars(newAvatars);
      } catch (error) {
        notify.notify().error('排序失败: ' + error.message);
      }
    }
  };

  const handleSetCurrent = async (avatarId) => {
    try {
      await setCurrent(avatarId);
      notify.notify().success('已设为当前头像');
    } catch (error) {
      notify.notify().error('设置当前头像失败: ' + error.message);
    }
  };

  // 删除头像
  const handleDelete = async (avatarId) => {
    try {
      const data = await deleteAvatar(avatarId);
      notify.notify().success(data?.msg || '已删除头像');
    } catch (error) {
      notify.notify().error('删除失败: ' + error.message);
    }
  };

  // 上传头像
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
      notify.notify().success('上传成功');
    } catch (error) {
      notify.notify().error('上传失败: ' + error.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" component="label" startIcon={<AddPhotoAlternateIcon />} disabled={loading}>
          上传新头像
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </Button>
        <Button variant="outlined" onClick={() => fetchAvatars()} disabled={loading}>手动刷新</Button>
      </Stack>
      <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={avatars.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {avatars.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  暂无头像，请上传新头像
                </Typography>
              ) : (
                avatars.map((avatar, index) => (
                  <SortableAvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    index={index}
                    onDelete={handleDelete}
                    onSetCurrent={handleSetCurrent}
                  />
                ))
              )}
            </Box>
          </SortableContext>
        </DndContext>
      </Paper>
    </Box>
  );
}
