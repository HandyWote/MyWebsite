import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Container, TextField, Paper, Stack, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, MenuItem } from '@mui/material';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config/api'; // 导入API配置
const CONTACT_TYPES = [
  { value: 'email', label: '邮箱' },
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'phone', label: '电话' },
  { value: 'other', label: '其他' }
];

function SortableContactCard({ contact, index, onEdit, onAdd, onDelete, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    marginBottom: 24,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'stretch',
  };
  return (
    <div ref={setNodeRef} style={style} {...props}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        pr: 1,
        pt: 2,
        minHeight: 120
      }}>
        <IconButton {...attributes} {...listeners} size="small" sx={{ cursor: 'grab' }} title="拖拽排序">
          <DragIndicatorIcon />
        </IconButton>
        <IconButton size="small" color="primary" onClick={() => onAdd(index)} title="在此后添加">
          <AddCircleOutlineIcon />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(index)} title="删除">
          <DeleteOutlineIcon />
        </IconButton>
      </Box>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, flex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="类型"
            value={contact.type}
            onChange={e => onEdit(index, 'type', e.target.value)}
            fullWidth
            variant="standard"
          >
            {CONTACT_TYPES.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="内容"
            value={contact.value}
            onChange={e => onEdit(index, 'value', e.target.value)}
            fullWidth
            variant="standard"
          />
        </Box>
      </Paper>
    </div>
  );
}

const ContactsManager = () => {
  const [contacts, setContacts] = useState([]);
  const [editedContacts, setEditedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [socket, setSocket] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // 拉取联系方式数据
  const fetchContacts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl.adminContacts(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    setContacts(data.data || []);
    setEditedContacts(data.data ? JSON.parse(JSON.stringify(data.data)) : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
    
    // 初始化WebSocket连接
    const newSocket = io(`${getApiUrl.websocket()}/contacts`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',
    });
    
    // 监听联系方式更新事件
    newSocket.on('contacts_updated', () => {
      console.log('收到联系方式更新通知，刷新数据...');
      fetchContacts();
    });
    
    // 监听连接事件
    newSocket.on('connect', () => {
      console.log('WebSocket连接已建立');
    });
    
    newSocket.on('disconnect', () => {
      console.log('WebSocket连接已断开');
    });
    
    setSocket(newSocket);
    
    // 清理函数
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // 编辑本地副本
  const handleEdit = (index, field, value) => {
    setEditedContacts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // 拖拽排序
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = editedContacts.findIndex(s => s.id === active.id);
      const newIndex = editedContacts.findIndex(s => s.id === over.id);
      setEditedContacts(arrayMove(editedContacts, oldIndex, newIndex));
    }
  };

  // 添加卡片
  const handleAdd = (index) => {
    setEditedContacts(prev => {
      const next = [...prev];
      const newContact = { id: `new_${Date.now()}`, type: 'email', value: '' };
      next.splice(index + 1, 0, newContact);
      return next;
    });
  };

  // 删除卡片
  const handleDelete = (index) => {
    setDeleteIndex(index);
  };
  const confirmDelete = () => {
    setEditedContacts(prev => prev.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };
  const cancelDelete = () => setDeleteIndex(null);

  // 批量保存
  const handleSaveAll = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    for (let i = 0; i < editedContacts.length; i++) {
      const contact = editedContacts[i];
      // 新增的卡片（id为new_xxx）
      if (typeof contact.id === 'string' && contact.id.startsWith('new_')) {
        await fetch(getApiUrl.adminContacts(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: contact.type,
            value: contact.value
          })
        });
      } else {
        await fetch(`${getApiUrl.adminContacts()}/${contact.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: contact.type,
            value: contact.value
          })
        });
      }
    }
    // 删除操作：找出原有但已被移除的联系方式
    const deleted = contacts.filter(s => !editedContacts.some(e => e.id === s.id));
    for (let d of deleted) {
      await fetch(`${getApiUrl.adminContacts()}/${d.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    await fetchContacts();
    setSaving(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>联系方式管理</Typography>
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={fetchContacts} disabled={loading || saving}>手动刷新</Button>
        <Button variant="contained" onClick={handleSaveAll} disabled={loading || saving}>保存全部更改</Button>
      </Stack>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={editedContacts.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {editedContacts.map((contact, index) => (
              <SortableContactCard
                key={contact.id}
                contact={contact}
                index={index}
                onEdit={handleEdit}
                onAdd={handleAdd}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
      <Dialog open={deleteIndex !== null} onClose={cancelDelete}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除该联系方式卡片吗？此操作不可撤销。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>取消</Button>
          <Button onClick={confirmDelete} color="error">确认删除</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContactsManager; 