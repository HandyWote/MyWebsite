import React, { useEffect, useState } from 'react';
import { Box, Button, Avatar, Paper, IconButton, Stack, Snackbar, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_PATH = 'http://localhost:5000/api/admin/avatars';

function SortableAvatarCard({ avatar, index, onDelete, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: avatar.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    marginBottom: 24,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    padding: 16,
    gap: 16
  };
  return (
    <div ref={setNodeRef} style={style} {...props}>
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 2 }} title="拖拽排序">
        <Avatar src={avatar.url} sx={{ width: 64, height: 64, border: index === 0 ? '3px solid #1AAD19' : 'none' }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ color: index === 0 ? '#1AAD19' : 'text.secondary', fontWeight: index === 0 ? 700 : 400 }}>
          {index === 0 ? '当前头像' : `头像${index + 1}`}
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.disabled' }}>{avatar.uploaded_at ? new Date(avatar.uploaded_at).toLocaleString() : ''}</Box>
      </Box>
      <Tooltip title="删除">
        <IconButton color="error" size="small" onClick={() => onDelete(index)}><DeleteIcon /></IconButton>
      </Tooltip>
    </div>
  );
}

const AvatarsManager = () => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));

  // 拉取头像数据
  const fetchAvatars = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(API_PATH, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    // 兼容 data.data 和 data.avatars
    const arr = (data.data || data.avatars || []).map(a => ({
      ...a,
      url: a.filename ? `/api/admin/avatars/file/${a.filename}` : ''
    }));
    setAvatars(arr);
    setLoading(false);
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  // 拖拽排序
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = avatars.findIndex(a => a.id === active.id);
      const newIndex = avatars.findIndex(a => a.id === over.id);
      const newAvatars = arrayMove(avatars, oldIndex, newIndex);
      setAvatars(newAvatars);
      // 设第一个为当前头像
      const token = localStorage.getItem('token');
      if (newAvatars.length > 0) {
        await fetch(`${API_PATH}/${newAvatars[0].id}/set_current`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSnackbarMsg('已设为当前头像');
        setSnackbarOpen(true);
      }
      fetchAvatars();
    }
  };

  // 删除头像
  const handleDelete = async (index) => {
    const avatar = avatars[index];
    const token = localStorage.getItem('token');
    await fetch(`${API_PATH}/${avatar.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setSnackbarMsg('已删除头像');
    setSnackbarOpen(true);
    fetchAvatars();
  };

  // 上传头像
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(API_PATH, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data.code === 0) {
      setSnackbarMsg('上传成功');
      setSnackbarOpen(true);
      // 立即将新头像插入到列表最前面，提升用户体验
      const newAvatar = {
        id: data.id,
        filename: file.name,
        url: data.url || '',
        uploaded_at: new Date().toISOString(),
        is_current: true
      };
      setAvatars(prev => [newAvatar, ...prev]);
      fetchAvatars();
    } else {
      setSnackbarMsg(data.msg || '上传失败');
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
              {avatars.map((avatar, index) => (
                <SortableAvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  index={index}
                  onDelete={handleDelete}
                />
              ))}
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
};

export default AvatarsManager; 