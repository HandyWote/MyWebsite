import React, { useEffect, useState } from 'react';
import { Box, Button, Avatar, Paper, IconButton, Stack, Snackbar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
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
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1
        }}
        title="拖拽排序"
      >
        <Avatar src={avatar.url || undefined} sx={{ width: 64, height: 64, border: index === 0 ? '3px solid #1AAD19' : 'none', mb: 1 }} />
        <Box sx={{ color: index === 0 ? '#1AAD19' : 'text.secondary', fontWeight: index === 0 ? 700 : 400, mb: 0.5 }}>
          {index === 0 ? '当前头像' : `头像${index + 1}`}
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.disabled', mb: 1 }}>
          {avatar.uploaded_at ? new Date(avatar.uploaded_at).toLocaleString() : ''}
        </Box>
        <Tooltip title="删除">
          <IconButton
            color="error"
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // 防止触发拖拽事件
              onDelete(avatar.id);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </div>
  );
}

const AvatarsManager = () => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // 拉取头像数据
  const fetchAvatars = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(API_PATH, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      // 兼容 data.data 和 data.avatars
      const arr = (data.data || data.avatars || []).map(a => {
        const API_BASE_URL = "http://localhost:5000";
        const url = a.filename ? `${API_BASE_URL}/api/admin/avatars/file/${a.filename}` : undefined;
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
    if (active.id !== over.id) {
      const oldIndex = avatars.findIndex(a => a.id === active.id);
      const newIndex = avatars.findIndex(a => a.id === over.id);
      const newAvatars = arrayMove(avatars, oldIndex, newIndex);
      setAvatars(newAvatars);
      // 设第一个为当前头像
      const token = localStorage.getItem('token');
      if (newAvatars.length > 0) {
        try {
          const res = await fetch(`${API_PATH}/${newAvatars[0].id}/set_current`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            setSnackbarMsg('已设为当前头像');
            setSnackbarOpen(true);
          } else {
            throw new Error('设置当前头像失败');
          }
        } catch (error) {
          setSnackbarMsg('设置当前头像失败: ' + error.message);
          setSnackbarOpen(true);
        }
      }
      fetchAvatars();
    }
  };

  // 删除头像确认
  const confirmDelete = (avatarId) => {
    console.log('confirmDelete called with avatarId:', avatarId);
    setAvatarToDelete(avatarId);
    setDeleteDialogOpen(true);
  };

  // 删除头像
  const handleDelete = async () => {
    console.log('handleDelete called, avatarToDelete:', avatarToDelete);
    setDeleteDialogOpen(false);

    if (!avatarToDelete) {
      console.error('No avatar to delete');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Sending DELETE request to:', `${API_PATH}/${avatarToDelete}`);

      const res = await fetch(`${API_PATH}/${avatarToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('DELETE response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('DELETE response data:', data);
        setSnackbarMsg(data.msg || '已删除头像');
        setSnackbarOpen(true);
        fetchAvatars(); // 刷新列表
      } else {
        const errorText = await res.text();
        console.error('DELETE failed:', res.status, res.statusText, errorText);
        throw new Error(`删除失败: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setSnackbarMsg('删除失败: ' + error.message);
      setSnackbarOpen(true);
    } finally {
      setAvatarToDelete(null);
    }
  };

  // 上传头像
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
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
        throw new Error(data.msg || '上传失败');
      }
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
              {avatars.map((avatar, index) => (
                  <SortableAvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    index={index}
                    onDelete={confirmDelete}
                  />
                ))}
            </Box>
          </SortableContext>
        </DndContext>
      </Paper>
      
      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除这个头像吗？此操作不可撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">删除</Button>
        </DialogActions>
      </Dialog>
      
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