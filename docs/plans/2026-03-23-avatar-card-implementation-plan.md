# 头像管理卡片重新设计 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 SortableAvatarCard 从自定义 div 重构为 MUI Card 组件，与 CommentsManager 风格一致

**Architecture:**
- 重构 `SortableAvatarCard` 组件
- 使用 MUI Card + CardContent + CardActions
- 添加 MoreVert 菜单用于删除
- 保持拖拽功能

**Tech Stack:** React, MUI, @dnd-kit

---

## Task 1: 重构 SortableAvatarCard 组件

**Files:**
- Modify: `frontend/src/admin/components/AvatarsManager.jsx:12-90`

**Step 1: 添加 MUI Card 相关导入**

在文件顶部 imports 中添加：
```javascript
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
```

**Step 2: 重构 SortableAvatarCard 组件**

将原有组件从 `<div ref={setNodeRef} style={style}>` 结构改为：

```jsx
function SortableAvatarCard({ avatar, index, onDelete, onSetCurrent, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: avatar.id });
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleDelete = () => {
    handleMenuClose();
    onDelete(avatar.id);
  };

  const isCurrent = index === 0;

  return (
    <Card ref={setNodeRef} sx={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      mb: 2,
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
```

**Step 3: 删除原内联样式对象**

删除原有的 style 对象（约21-33行）：
```javascript
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
```

**Step 4: 确认组件结构正确**

运行前端 dev server 检查：
```bash
cd frontend && npm run dev
```

---

## Task 2: 验证与测试

**Step 1: 视觉检查**

1. 访问头像管理页
2. 确认卡片有虚线边框（Pixel 主题）
3. 确认 hover 时边框变蓝色实线
4. 确认当前头像有蓝色边框

**Step 2: 功能测试**

1. 点击 MoreVert 按钮，确认菜单出现
2. 点击"删除头像"，确认删除功能正常
3. 点击"设为当前头像"，确认功能正常
4. 拖拽卡片，确认排序功能正常

**Step 3: 空状态检查**

确认无头像时显示空状态提示

---

## 验证清单

- [ ] 卡片有 Pixel 主题虚线边框
- [ ] hover 时边框变为蓝色实线
- [ ] 当前头像有蓝色边框区分
- [ ] MoreVert 菜单可正常打开
- [ ] 删除功能正常
- [ ] 设为当前头像功能正常
- [ ] 拖拽排序功能正常
- [ ] 空状态显示正常

## 回滚计划

如有问题，参考 git diff 恢复原文件：
```bash
git checkout HEAD -- frontend/src/admin/components/AvatarsManager.jsx
```
