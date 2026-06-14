import { useEffect, useState } from 'react';
import { Box, Button, Avatar, Paper, IconButton, Stack, Snackbar, Tooltip, Typography } from '@mui/material';
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
import { getApiUrl, api } from '../../config/api';

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
      border: '1px dashed #30363d',
      '&:hover': {
        border: '1px solid #58a6ff',
        borderStyle: 'solid',
      },
    }} {...props}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 拖拽区域 + 头像 */}
          <Box {...attributes} {...listeners} sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
            <Avatar
              src={avatar.url || undefined}
              sx={{ width: 64, height: 64, border: isCurrent ? '3px solid #58a6ff' : 'none' }}
            />
          </Box>

          {/* 信息区 */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#58a6ff' : 'text.secondary' }}>
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
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));

  // 拉取头像数据
  const fetchAvatars = async () => {
    setLoading(true);
    try {
      const data = await api.get(getApiUrl.adminAvatars());
      // apiClient 自动解包了 data.data，兼容 data 和 avatars
      const arr = (data || []).map(a => {
        const url = a.filename ? getApiUrl.avatarFile(a.filename) : undefined;
        return { ...a, url };
      });
      setAvatars(arr);
    } catch (error) {
      setSnackbarMsg('获取头像列表失败: ' + error.message);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

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
      setAvatars(newAvatars);
      
      // 设第一个为当前头像
      if (newAvatars.length > 0) {
        await handleSetCurrent(newAvatars[0].id);
      }
    }
  };

  const handleSetCurrent = async (avatarId) => {
    try {
      await api.put(getApiUrl.adminAvatarSetCurrent(avatarId));
      setSnackbarMsg('已设为当前头像');
      setSnackbarOpen(true);
      fetchAvatars();
    } catch (error) {
      setSnackbarMsg('设置当前头像失败: ' + error.message);
      setSnackbarOpen(true);
    }
  };

  // 删除头像
  const handleDelete = async (avatarId) => {
    try {
      const data = await api.del(getApiUrl.adminAvatarDelete(avatarId));
      setSnackbarMsg(data?.msg || '已删除头像');
      setSnackbarOpen(true);
      fetchAvatars(); // 刷新列表
    } catch (error) {
      setSnackbarMsg('删除失败: ' + error.message);
      setSnackbarOpen(true);
    }
  };

  // 上传头像
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await api.upload(getApiUrl.adminAvatars(), file);
      setSnackbarMsg('上传成功');
      setSnackbarOpen(true);
      // 从服务器获取最新列表，确保数据一致性
      fetchAvatars();
    } catch (error) {
      setSnackbarMsg('上传失败: ' + error.message);
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" component="label" startIcon={<AddPhotoAlternateIcon />} disabled={loading}>
          上传新头像
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </Button>
        <Button variant="outlined" onClick={fetchAvatars} disabled={loading}>手动刷新</Button>
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
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1500}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
