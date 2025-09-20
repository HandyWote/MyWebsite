import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Container, LinearProgress, TextField, Slider, Paper, Stack, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config/api'; // 导入API配置

function SortableSkillCard({ skill, index, onEdit, onAdd, onDelete, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id });
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
        justifyContent: 'center', // 垂直居中
        gap: 2, // 统一间距
        pr: 1,
        pt: 2,
        minHeight: 120 // 保证高度一致
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
            label="名称"
            value={skill.name}
            onChange={e => onEdit(index, 'name', e.target.value)}
            fullWidth
            variant="standard"
          />
          <TextField
            label="描述"
            value={skill.description}
            onChange={e => onEdit(index, 'description', e.target.value)}
            fullWidth
            multiline
            minRows={1}
            variant="standard"
            InputProps={{
              sx: {
                paddingBottom: '0px',
                fontSize: '1rem',
                lineHeight: 1.2,
                height: '28px',
              }
            }}
            sx={{
              mb: 0,
              '& .MuiInputBase-root': {
                paddingBottom: '0px',
                height: '28px',
              },
              '& textarea': {
                padding: 0,
                height: '28px !important',
                lineHeight: 1.2,
                boxSizing: 'border-box'
              }
            }}
          />
          <Box>
            <Typography gutterBottom>熟练度：{skill.level}</Typography>
            <Slider
              value={skill.level}
              min={0}
              max={100}
              step={1}
              onChange={(_, value) => onEdit(index, 'level', value)}
              sx={{ width: 200 }}
            />
            <LinearProgress
              variant="determinate"
              value={skill.level}
              sx={{ height: 10, borderRadius: 4, mt: 1, width: 200 }}
            />
          </Box>
        </Box>
      </Paper>
    </div>
  );
}

const SkillsManager = () => {
  const [skills, setSkills] = useState([]);
  const [editedSkills, setEditedSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const [socket, setSocket] = useState(null);

  // 拉取技能数据
  const fetchSkills = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl.adminSkills(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    setSkills(data.data || []);
    setEditedSkills(data.data ? JSON.parse(JSON.stringify(data.data)) : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSkills();
    
    // 初始化WebSocket连接
    const newSocket = io(`${getApiUrl.websocket()}/skills`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',
    });
    
    // 监听技能更新事件
    newSocket.on('skills_updated', () => {
      console.log('收到技能更新通知，刷新数据...');
      fetchSkills();
    });
    
    // 监听命名空间连接事件
    newSocket.on('connect', () => {
      console.log('WebSocket连接已建立');
    });
    
    newSocket.on('disconnect', () => {
      console.log('WebSocket连接已断开');
    });
    
    // 监听命名空间连接事件
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
    setEditedSkills(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // 拖拽排序
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = editedSkills.findIndex(s => s.id === active.id);
      const newIndex = editedSkills.findIndex(s => s.id === over.id);
      setEditedSkills(arrayMove(editedSkills, oldIndex, newIndex));
    }
  };

  // 添加卡片
  const handleAdd = (index) => {
    setEditedSkills(prev => {
      const next = [...prev];
      const newSkill = { id: `new_${Date.now()}`, name: '', description: '', level: 50 };
      next.splice(index + 1, 0, newSkill);
      return next;
    });
  };

  // 删除卡片
  const handleDelete = (index) => {
    setDeleteIndex(index);
  };
  const confirmDelete = () => {
    setEditedSkills(prev => prev.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };
  const cancelDelete = () => setDeleteIndex(null);

  // 批量保存
  const handleSaveAll = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    for (let i = 0; i < editedSkills.length; i++) {
      const skill = editedSkills[i];
      // 新增的卡片（id为new_xxx）
      if (typeof skill.id === 'string' && skill.id.startsWith('new_')) {
        await fetch(getApiUrl.adminSkills(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: skill.name,
            description: skill.description,
            level: skill.level
          })
        });
      } else {
        await fetch(`${getApiUrl.adminSkills()}/${skill.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: skill.name,
            description: skill.description,
            level: skill.level
          })
        });
      }
    }
    // 删除操作：找出原有但已被移除的技能
    const deleted = skills.filter(s => !editedSkills.some(e => e.id === s.id));
    for (let d of deleted) {
      await fetch(`${getApiUrl.adminSkills()}/${d.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    await fetchSkills();
    setSaving(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>技能管理</Typography>
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={fetchSkills} disabled={loading || saving}>手动刷新</Button>
        <Button variant="contained" onClick={handleSaveAll} disabled={loading || saving}>保存全部更改</Button>
      </Stack>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={editedSkills.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {editedSkills.map((skill, index) => (
              <SortableSkillCard
                key={skill.id}
                skill={skill}
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
          <DialogContentText>确定要删除该技能卡片吗？此操作不可撤销。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>取消</Button>
          <Button onClick={confirmDelete} color="error">确认删除</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SkillsManager; 