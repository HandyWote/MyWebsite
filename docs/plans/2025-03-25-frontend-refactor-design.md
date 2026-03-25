# 前端架构重构设计方案

## 概述

重构 `ArticlesManager.jsx`（~800行），实现渲染与逻辑解耦，建立清晰的状态管理模式。

## 问题分析

### 当前问题

| 问题 | 影响 |
|------|------|
| 组件过大 | ArticlesManager 800行，20+ useState |
| 职责混乱 | CRUD、AI分析、PDF上传、批量导入、UI状态混杂 |
| 代码重复 | 多处重复的 fetch 调用、token 处理、错误处理 |
| 未复用封装 | useApi Hook 已实现但未被使用 |
| 可测试性差 | 逻辑与渲染耦合，难以单元测试 |

## 技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 状态管理 | Zustand | 轻量（~1KB）、简单、可扩展、无 Provider |
| useApi 处理 | 改造为 apiClient 工具函数 | 复用逻辑、单一数据层、可测试 |
| 拆分策略 | 层次 + 功能双重拆分 | 职责清晰、组件可复用 |
| 组件通信 | Store + Props 混合 | 业务状态共享、UI 状态局部化 |
| 迁移方式 | 渐进式 | 风险可控、可回滚 |

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    展示层 (Presentational)              │
│  ArticleList │ ArticleEditor │ AiAnalyzer │ Importer    │
│    (纯渲染)       (纯渲染)        (纯渲染)      (纯渲染)    │
└─────────────────────────────────────────────────────────┘
                           ↑ props + callbacks
┌─────────────────────────────────────────────────────────┐
│                 容器层 (Container)                      │
│              ArticlesManager.jsx                        │
│        (UI状态管理、组合子组件、事件协调)                  │
└─────────────────────────────────────────────────────────┘
                           ↑ Zustand hooks
┌─────────────────────────────────────────────────────────┐
│                  数据层 (Store)                         │
│              stores/articleStore.js                     │
│        (业务数据、API调用、全局状态)                       │
└─────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────┐
│                 工具层 (Utility)                        │
│               utils/apiClient.js                        │
│        (HTTP请求、认证、错误处理)                         │
└─────────────────────────────────────────────────────────┘
```

### 状态职责划分

| 状态类型 | 存放位置 | 示例 |
|---------|---------|------|
| 业务数据 | Store | articles, loading, error, aiAnalysis |
| 跨组件共享 | Store | 当前选中文章 |
| UI 局部状态 | 容器组件 useState | 对话框开关、编辑中的文章 |
| 表单状态 | 子组件 useState | formData, errors, saving |

### 数据流

```
用户操作 → 子组件回调 → 容器组件处理 UI 状态
                      → Store 处理业务逻辑
                      → apiClient 发送请求
                      → Store 更新数据
                      → 组件自动重渲染
```

## 文件结构

```
frontend/src/
├── stores/                          # 新增：Zustand 状态管理
│   ├── index.js                     # 统一导出
│   └── articleStore.js              # 文章相关状态
│
├── utils/
│   ├── apiClient.js                 # 新增：API 请求工具
│   ├── errorHandler.js              # 现有
│   └── iconMap.jsx                  # 现有
│
├── admin/
│   └── components/
│       ├── ArticlesManager.jsx      # 重构：容器组件（~150行）
│       └── articles/                # 新增：文章子组件目录
│           ├── ArticleList.jsx      # 文章列表
│           ├── ArticleEditor.jsx    # 文章编辑对话框
│           ├── ArticleImporter.jsx  # 批量导入
│           ├── AiAnalyzer.jsx       # AI 分析对话框
│           └── index.js             # 统一导出
│
└── hooks/
    └── useApi.js                    # 保留，标记 deprecated
```

## 模块设计

### apiClient

```js
// utils/apiClient.js

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: (endpoint) => apiClient(endpoint),
  post: (endpoint, data) => apiClient(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => apiClient(endpoint, { method: 'PUT', body: data }),
  del: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
```

### articleStore

```js
// stores/articleStore.js
import { create } from 'zustand';
import { api } from '@/utils/apiClient';

const useArticleStore = create((set, get) => ({
  // 状态
  articles: [],
  loading: false,
  error: null,
  aiAnalysis: null,
  aiLoading: false,

  // CRUD
  fetchArticles: async () => { /* ... */ },
  createArticle: async (article) => { /* ... */ },
  updateArticle: async (id, article) => { /* ... */ },
  deleteArticle: async (id) => { /* ... */ },

  // AI
  analyzeArticle: async (id) => { /* ... */ },
  clearAiAnalysis: () => set({ aiAnalysis: null }),

  // 工具
  getArticleById: (id) => get().articles.find((a) => a.id === id),
  reset: () => set({ articles: [], loading: false, error: null }),
}));

export default useArticleStore;
```

### 子组件

#### ArticleList（纯渲染）

```jsx
// admin/components/articles/ArticleList.jsx
export default function ArticleList({
  articles,
  loading,
  onEdit,
  onDelete,
  onAnalyze
}) {
  // 只负责渲染，无业务逻辑
}
```

#### ArticleEditor（纯渲染 + 局部表单状态）

```jsx
// admin/components/articles/ArticleEditor.jsx
export default function ArticleEditor({
  open,
  article,      // null = 新建
  onSave,
  onClose
}) {
  // 表单状态局部管理
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
}
```

#### AiAnalyzer（纯渲染）

```jsx
// admin/components/articles/AiAnalyzer.jsx
export default function AiAnalyzer({
  open,
  article,
  analysis,
  loading,
  onAnalyze,
  onClose
}) {
  // 只负责渲染分析结果
}
```

#### ArticleImporter（纯渲染 + 局部上传状态）

```jsx
// admin/components/articles/ArticleImporter.jsx
export default function ArticleImporter({
  open,
  onImport,
  onClose
}) {
  // 上传状态局部管理
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
}
```

### ArticlesManager（容器组件）

```jsx
// admin/components/ArticlesManager.jsx (~150行)
export default function ArticlesManager() {
  // Store 状态
  const { articles, loading, fetchArticles, createArticle, ... } = useArticleStore();

  // UI 状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  // ...

  // 事件处理
  const handleEdit = (article) => { /* ... */ };
  const handleSave = async (formData) => { /* ... */ };
  // ...

  // 组合子组件
  return (
    <Box>
      <ArticleList ... />
      <ArticleEditor ... />
      <AiAnalyzer ... />
      <ArticleImporter ... />
    </Box>
  );
}
```

## 迁移策略

### 阶段 1: 基础设施（无破坏性）

```
1. 安装 zustand
2. 创建 utils/apiClient.js + 测试
3. 创建 stores/articleStore.js + 测试
```

### 阶段 2: 创建子组件（并行存在）

```
1. 创建 admin/components/articles/ 目录
2. 实现各子组件 + 测试
3. 与旧组件并行存在，不影响现有功能
```

### 阶段 3: 重构容器组件

```
1. 创建新 ArticlesManager.jsx（使用新架构）
2. 功能测试通过后替换旧文件
3. 完整功能回归测试
```

### 阶段 4: 清理

```
1. 删除旧代码中的冗余部分
2. 标记 useApi.js 为 deprecated
3. 更新文档
```

## 测试策略

### TDD 流程

```
Red → Green → Refactor
1. 先写测试（失败）
2. 写最少代码使测试通过
3. 重构优化
```

### 测试覆盖

| 层级 | 测试内容 | 工具 |
|------|---------|------|
| apiClient | 请求配置、错误处理、响应解析 | Vitest + MSW |
| articleStore | 状态更新、异步操作、错误处理 | Vitest |
| 子组件 | 渲染输出、用户交互、回调触发 | Vitest + Testing Library |
| 容器组件 | 子组件组合、事件流程 | Vitest + Testing Library |

## 预期效果

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 代码行数 | ~800 行 | ~150 行 |
| useState 数量 | 20+ | 6 |
| API 调用 | 直接 fetch | Store 统一管理 |
| 职责 | 5+ 个混杂 | 单一协调职责 |
| 可测试性 | 困难 | 子组件独立测试 |
| 可复用性 | 无 | 子组件可复用 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 功能回归 | 渐进式迁移，每阶段验证 |
| 学习成本 | Zustand API 简单，约 1 小时上手 |
| 时间投入 | 预计 2-3 天完成全部重构 |

## 参考资源

- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW - Mock Service Worker](https://mswjs.io/)
