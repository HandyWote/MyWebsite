# 前端重构设计方案：Terminal Aesthetics

> 创建日期: 2026-03-22
> 状态: 已确认

## 1. 设计理念

**核心概念**：将程序员的身份认同转化为视觉语言。网站本身就像一个精心设计的 IDE / Terminal，让访客感受到主人的技术基因。

**关键词**：代码、终端、网格、克制、精准

---

## 2. 色彩系统

```css
:root {
  /* 主背景 - 深黑终端 */
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;

  /* 强调色 - GitHub 蓝 + 终端绿 */
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-purple: #a371f7;

  /* 文字 - 白蓝黑比例 6:3:1 */
  --text-primary: #f0f6fc;      /* 白色系 60% */
  --text-secondary: #8b949e;    /* 蓝色系 30% */
  --text-muted: #484f58;        /* 黑色系 10% */

  /* 边框 */
  --border-default: #30363d;
  --border-muted: #21262d;

  /* 交互状态 */
  --hover-bg: #1f2428;
  --active-bg: #2d333b;
}
```

---

## 3. 字体系统

| 用途 | 字体 | 备选 |
|------|------|------|
| 代码/标题 | JetBrains Mono | Fira Code, Source Code Pro |
| 中文正文 | Noto Sans SC | 思源黑体 |
| 英文正文 | IBM Plex Sans | - |

---

## 4. 像素风格规范

### 边框规范
```css
border: 1px dashed var(--border-default);     /* 默认虚线 */
border: 2px solid var(--accent-blue);         /* 强调边框 */
border-radius: 0;                              /* 方正像素感 */
```

### 背景纹理
```css
/* 点阵背景 */
background-image: radial-gradient(circle, var(--border-muted) 1px, transparent 1px);
background-size: 24px 24px;

/* 扫描线效果 */
background: repeating-linear-gradient(
  0deg, transparent, transparent 2px,
  rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px
);
```

---

## 5. 动画规范

| 动画 | 效果 |
|------|------|
| 光标闪烁 | `blink` keyframes, 1s infinite |
| 滑入 | `slideInLeft`, translateX(-20px) → 0, opacity 0 → 1 |
| Hover | border-color 变化 + translateY(-2px) |

---

## 6. 组件库架构

```
src/components/pixel/
├── index.jsx              # 统一导出
├── tokens.js              # 设计令牌
├── PixelProvider.jsx       # ThemeProvider
├── base/
│   ├── PixelBox.jsx
│   └── PixelText.jsx
├── ui/
│   ├── PixelButton.jsx
│   ├── PixelCard.jsx
│   ├── PixelInput.jsx
│   ├── PixelChip.jsx
│   ├── PixelAvatar.jsx
│   └── PixelDialog.jsx
└── layout/
    ├── PixelContainer.jsx
    ├── PixelNavbar.jsx
    └── PixelFooter.jsx
```

---

## 7. 核心组件设计

### PixelButton 变体
| 变体 | 样式 |
|------|------|
| primary | bg-blue, text-white |
| outline | bg-transparent, border-blue, text-blue |
| ghost | bg-transparent, text-blue |
| destructive | bg-red, text-white |

### PixelCard 结构
```
┌─────────────────────────────┐
│ ▌ 标题                      │  ← 蓝色左边框
├─────────────────────────────┤
│ 内容区                       │
└─────────────────────────────┘
border: 1px dashed var(--border-default)
hover: border solid + accent-blue
```

---

## 8. 页面改造

### Home 页面概念
```
┌─────────────────────────────────────┐
│ ▌ ~/handywote                      │
├─────────────────────────────────────┤
│   HandyWote_                       │  ← 闪烁光标
│   ───────────                       │
│   少年侠气交结五都雄！              │
│   汕头大学 | 黄应辉                 │
│                                     │
│   [➤ Projects]  [➤ Articles]       │
└─────────────────────────────────────┘
```

---

## 9. 实施步骤

### Phase 1: 基础设施
- [ ] 创建 tokens.js - 设计令牌
- [ ] 创建 PixelProvider.jsx - MUI 主题集成
- [ ] 创建全局 CSS 变量和基础样式

### Phase 2: 基础组件
- [ ] PixelBox、PixelText
- [ ] PixelButton、PixelCard
- [ ] PixelInput、PixelChip、PixelAvatar

### Phase 3: 布局组件
- [ ] PixelContainer、PixelNavbar、PixelFooter

### Phase 4: 前台替换
- [ ] Home 页面改造
- [ ] Articles 页面改造
- [ ] Projects 页面改造
- [ ] ArticleDetail 改造

### Phase 5: Admin 替换
- [ ] Admin 组件库替换
- [ ] AdminLayout 改造

### Phase 6: 收尾
- [ ] 清理旧样式文件
- [ ] 动画效果调优
- [ ] 响应式测试

---

## 10. 技术选型

| 项目 | 技术 |
|------|------|
| 框架扩展 | MUI Theme Provider |
| 动画 | Framer Motion + CSS |
| 字体 | Google Fonts JetBrains Mono |
| 图标 | Lucide React |
