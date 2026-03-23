# 头像管理卡片重新设计

## 背景

当前 `SortableAvatarCard` 使用自定义 div + inline styles，与项目 Pixel 风格不一致：
- `borderRadius: 12` 与 Pixel 风格的方正边框不符
- 未使用 MUI Card 组件，与 CommentsManager 风格不统一
- 缺少状态视觉区分

## 设计方案

**采用方案 A：参考 CommentsManager 的 Card 风格**

### 组件结构

```
Card (MUI)
├── CardContent
│   └── Box (flex, alignItems: center, gap: 2)
│       ├── Avatar (64x64)
│       │         当前头像: 3px solid #58a6ff 边框
│       ├── Box (flex: 1, 信息区)
│       │   ├── Typography: 当前头像 / 头像N
│       │   └── Typography: 上传时间 (caption)
│       ├── MoreVertIconButton (菜单触发)
│       └── Menu
│           └── MenuItem: 删除头像
└── CardActions (bgcolor: action.hover)
    ├── Typography: ID
    └── Button: 设为当前头像 (disabled 当当前头像)
```

### 布局示意

```
┌─────────────────────────────────────────────────────────────┐
│ [头像]  当前头像                               [⋮]          │
│  64px    2024/01/15 12:30                        │         │
│          上传时间                                   [删除]   │
├─────────────────────────────────────────────────────────────┤
│  ID: 1                               [✓ 设为当前头像]       │
└─────────────────────────────────────────────────────────────┘
```

### 与 CommentsManager 的差异

| 元素 | 评论卡片 | 头像卡片（新建） |
|------|---------|----------------|
| 状态 Chip | 有（正常/待审核/垃圾） | 无 |
| 展开功能 | 有（可展开评论内容） | 无 |
| 菜单内容 | 多种状态操作 | 仅删除 |
| 拖拽 | 无 | 有（保留） |

### 样式继承 Pixel 主题

- `borderRadius: 0` (Card 默认已配置)
- `border: 1px dashed #30363d` (Card 默认已配置)
- hover 时 `borderColor: #58a6ff` (Card 默认已配置)
- 字体：mono font family

### 交互行为

| 操作 | 行为 |
|------|------|
| 点击 MoreVert | 打开删除菜单 |
| 点击删除 | 调用 onDelete |
| 点击"设为当前头像" | 调用 onSetCurrent |
| 当前头像 | Button disabled，文字变为"当前头像" |
| 拖拽 | 整个 Card 可拖拽，保持拖拽手柄样式 |

## 变更文件

- `frontend/src/admin/components/AvatarsManager.jsx`
  - 重构 `SortableAvatarCard` 组件
  - 使用 MUI Card + CardContent + CardActions
  - 添加 Menu 删除选项
  - 保持拖拽功能

## 验证清单

- [ ] 卡片显示与 CommentsManager 风格一致
- [ ] Pixel 主题样式正确（边框、hover）
- [ ] 拖拽功能正常
- [ ] 删除功能正常
- [ ] 设为当前头像功能正常
- [ ] 当前头像有视觉区分
