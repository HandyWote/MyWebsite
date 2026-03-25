# Frontend Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构 ArticlesManager.jsx，实现渲染与逻辑解耦，建立 Zustand 状态管理模式。

**Architecture:** 四层架构 - 工具层(apiClient) → 数据层(Store) → 容器层(ArticlesManager) → 展示层(子组件)

**Tech Stack:** React, Zustand, Vitest, Testing Library, MSW

---

## Phase 1: 基础设施层

### Task 1: 安装 Zustand 依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装 zustand**

Run: `cd frontend && npm install zustand`
Expected: package.json 中添加 zustand 依赖

**Step 2: 验证安装**

Run: `cd frontend && npm list zustand`
Expected: 显示 zustand 版本

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add zustand dependency"
```

---

### Task 2: 创建 apiClient 工具函数（TDD）

**Files:**
- Create: `frontend/src/utils/apiClient.js`
- Create: `frontend/src/utils/apiClient.test.js`

**Step 1: 创建测试文件**

```javascript
// frontend/src/utils/apiClient.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, api, ApiError } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('apiClient', () => {
    it('should make GET request with correct headers', async () => {
      const mockData = { data: { id: 1, title: 'Test' } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiClient('/api/articles');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should include Authorization header when token exists', async () => {
      localStorage.setItem('token', 'test-token');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await apiClient('/api/articles');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should throw ApiError on non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient('/api/articles/999')).rejects.toThrow(ApiError);
      await expect(apiClient('/api/articles/999')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
      });
    });
  });

  describe('api convenience methods', () => {
    it('api.get should call apiClient with GET', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get('/api/articles');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles',
        expect.objectContaining({ method: undefined })
      );
    });

    it('api.post should call apiClient with POST and body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.post('/api/articles', { title: 'New' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New' }),
        })
      );
    });

    it('api.put should call apiClient with PUT and body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.put('/api/articles/1', { title: 'Updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ title: 'Updated' }),
        })
      );
    });

    it('api.del should call apiClient with DELETE', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.del('/api/articles/1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/articles/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('ApiError', () => {
    it('should have status and message properties', () => {
      const error = new ApiError(404, 'Not found');

      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/utils/apiClient.test.js`
Expected: FAIL - 模块不存在

**Step 3: 实现最小代码使测试通过**

```javascript
// frontend/src/utils/apiClient.js
const BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';

/**
 * 统一的 API 请求客户端
 */
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

  // 处理 body（支持对象自动序列化）
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

/**
 * 便捷方法
 */
export const api = {
  get: (endpoint) => apiClient(endpoint),
  post: (endpoint, data) => apiClient(endpoint, { method: 'POST', body: data }),
  put: (endpoint, data) => apiClient(endpoint, { method: 'PUT', body: data }),
  del: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
};

/**
 * 自定义错误类
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/utils/apiClient.test.js`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/utils/apiClient.js frontend/src/utils/apiClient.test.js
git commit -m "feat: add apiClient utility with tests"
```

---

### Task 3: 创建 articleStore（TDD）

**Files:**
- Create: `frontend/src/stores/index.js`
- Create: `frontend/src/stores/articleStore.js`
- Create: `frontend/src/stores/articleStore.test.js`

**Step 1: 创建测试文件**

```javascript
// frontend/src/stores/articleStore.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import useArticleStore from './articleStore';

// Mock apiClient
vi.mock('@/utils/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

import { api } from '@/utils/apiClient';

describe('articleStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useArticleStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useArticleStore.getState();

      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.aiAnalysis).toBe(null);
      expect(state.aiLoading).toBe(false);
    });
  });

  describe('fetchArticles', () => {
    it('应该成功获取文章列表', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1' },
        { id: 2, title: 'Article 2' },
      ];
      api.get.mockResolvedValueOnce({ data: mockArticles });

      await act(async () => {
        await useArticleStore.getState().fetchArticles();
      });

      const state = useArticleStore.getState();
      expect(state.articles).toEqual(mockArticles);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('应该处理获取失败', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useArticleStore.getState().fetchArticles();
      });

      const state = useArticleStore.getState();
      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('应该在请求时设置 loading 状态', async () => {
      api.get.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100)));

      act(() => {
        useArticleStore.getState().fetchArticles();
      });

      expect(useArticleStore.getState().loading).toBe(true);
    });
  });

  describe('createArticle', () => {
    it('应该成功创建文章', async () => {
      const newArticle = { title: 'New Article', content: 'Content' };
      const createdArticle = { id: 1, ...newArticle };
      api.post.mockResolvedValueOnce({ data: createdArticle });

      const result = await act(async () => {
        return await useArticleStore.getState().createArticle(newArticle);
      });

      const state = useArticleStore.getState();
      expect(state.articles).toContainEqual(createdArticle);
      expect(result).toEqual({ data: createdArticle });
    });
  });

  describe('updateArticle', () => {
    it('应该成功更新文章', async () => {
      // 先设置初始状态
      useArticleStore.setState({
        articles: [{ id: 1, title: 'Old Title', content: 'Old Content' }],
      });

      const updatedArticle = { id: 1, title: 'New Title', content: 'New Content' };
      api.put.mockResolvedValueOnce({ data: updatedArticle });

      await act(async () => {
        await useArticleStore.getState().updateArticle(1, { title: 'New Title', content: 'New Content' });
      });

      const state = useArticleStore.getState();
      expect(state.articles[0]).toEqual(updatedArticle);
    });
  });

  describe('deleteArticle', () => {
    it('应该成功删除文章', async () => {
      useArticleStore.setState({
        articles: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' },
        ],
      });

      api.del.mockResolvedValueOnce({});

      await act(async () => {
        await useArticleStore.getState().deleteArticle(1);
      });

      const state = useArticleStore.getState();
      expect(state.articles).toHaveLength(1);
      expect(state.articles[0].id).toBe(2);
    });
  });

  describe('analyzeArticle', () => {
    it('应该成功分析文章', async () => {
      const mockAnalysis = { summary: 'AI Summary', keywords: ['keyword1'] };
      api.post.mockResolvedValueOnce(mockAnalysis);

      await act(async () => {
        await useArticleStore.getState().analyzeArticle(1);
      });

      const state = useArticleStore.getState();
      expect(state.aiAnalysis).toEqual(mockAnalysis);
      expect(state.aiLoading).toBe(false);
    });
  });

  describe('getArticleById', () => {
    it('应该根据 ID 获取文章', () => {
      useArticleStore.setState({
        articles: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' },
        ],
      });

      const article = useArticleStore.getState().getArticleById(1);
      expect(article).toEqual({ id: 1, title: 'Article 1' });
    });

    it('文章不存在时应返回 undefined', () => {
      useArticleStore.setState({ articles: [] });

      const article = useArticleStore.getState().getArticleById(999);
      expect(article).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', () => {
      useArticleStore.setState({
        articles: [{ id: 1 }],
        loading: true,
        error: 'Some error',
        aiAnalysis: { summary: 'test' },
        aiLoading: true,
      });

      useArticleStore.getState().reset();

      const state = useArticleStore.getState();
      expect(state.articles).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.aiAnalysis).toBe(null);
      expect(state.aiLoading).toBe(false);
    });
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/stores/articleStore.test.js`
Expected: FAIL - 模块不存在

**Step 3: 创建 stores 目录和 index.js**

```javascript
// frontend/src/stores/index.js
export { default as useArticleStore } from './articleStore';
```

**Step 4: 实现 articleStore**

```javascript
// frontend/src/stores/articleStore.js
import { create } from 'zustand';
import { api } from '@/utils/apiClient';

const useArticleStore = create((set, get) => ({
  // ========== 状态 ==========
  articles: [],
  loading: false,
  error: null,

  // AI 相关
  aiAnalysis: null,
  aiLoading: false,

  // ========== 文章 CRUD ==========
  fetchArticles: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/api/articles');
      set({ articles: data.data || data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createArticle: async (article) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/api/articles', article);
      set((state) => ({
        articles: [...state.articles, data.data || data],
        loading: false,
      }));
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateArticle: async (id, article) => {
    set({ loading: true, error: null });
    try {
      const data = await api.put(`/api/articles/${id}`, article);
      set((state) => ({
        articles: state.articles.map((a) =>
          a.id === id ? (data.data || data) : a
        ),
        loading: false,
      }));
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteArticle: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.del(`/api/articles/${id}`);
      set((state) => ({
        articles: state.articles.filter((a) => a.id !== id),
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ========== AI 功能 ==========
  analyzeArticle: async (id) => {
    set({ aiLoading: true, error: null });
    try {
      const data = await api.post(`/api/articles/${id}/analyze`);
      set({ aiAnalysis: data, aiLoading: false });
      return data;
    } catch (err) {
      set({ error: err.message, aiLoading: false });
      throw err;
    }
  },

  clearAiAnalysis: () => set({ aiAnalysis: null }),

  // ========== 工具方法 ==========
  getArticleById: (id) => get().articles.find((a) => a.id === id),

  reset: () =>
    set({
      articles: [],
      loading: false,
      error: null,
      aiAnalysis: null,
      aiLoading: false,
    }),
}));

export default useArticleStore;
```

**Step 5: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/stores/articleStore.test.js`
Expected: PASS - 所有测试通过

**Step 6: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat: add articleStore with tests"
```

---

## Phase 2: 展示层组件

### Task 4: 创建 ArticleList 组件（TDD）

**Files:**
- Create: `frontend/src/admin/components/articles/ArticleList.jsx`
- Create: `frontend/src/admin/components/articles/ArticleList.test.jsx`

**Step 1: 创建测试文件**

```javascript
// frontend/src/admin/components/articles/ArticleList.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArticleList from './ArticleList';

describe('ArticleList', () => {
  const mockArticles = [
    { id: 1, title: 'Article 1', summary: 'Summary 1', created_at: '2024-01-01' },
    { id: 2, title: 'Article 2', summary: 'Summary 2', created_at: '2024-01-02' },
  ];

  const defaultProps = {
    articles: mockArticles,
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAnalyze: vi.fn(),
  };

  it('应该渲染文章列表', () => {
    render(<ArticleList {...defaultProps} />);

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('loading 时应该显示加载状态', () => {
    render(<ArticleList {...defaultProps} loading={true} />);

    // 应该显示骨架屏或加载指示器
    expect(screen.queryByText('Article 1')).not.toBeInTheDocument();
  });

  it('文章为空时应该显示空状态', () => {
    render(<ArticleList {...defaultProps} articles={[]} />);

    expect(screen.getByText(/暂无文章/)).toBeInTheDocument();
  });

  it('点击编辑按钮应该调用 onEdit', () => {
    render(<ArticleList {...defaultProps} />);

    const editButtons = screen.getAllByLabelText(/编辑/);
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockArticles[0]);
  });

  it('点击删除按钮应该调用 onDelete', () => {
    render(<ArticleList {...defaultProps} />);

    const deleteButtons = screen.getAllByLabelText(/删除/);
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockArticles[0].id);
  });

  it('点击 AI 分析按钮应该调用 onAnalyze', () => {
    render(<ArticleList {...defaultProps} />);

    const analyzeButtons = screen.getAllByLabelText(/AI 分析/);
    fireEvent.click(analyzeButtons[0]);

    expect(defaultProps.onAnalyze).toHaveBeenCalledWith(mockArticles[0]);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleList.test.jsx`
Expected: FAIL - 组件不存在

**Step 3: 创建目录和组件**

```bash
mkdir -p frontend/src/admin/components/articles
```

```jsx
// frontend/src/admin/components/articles/ArticleList.jsx
import { Box, CircularProgress, Typography, IconButton, Tooltip, Card, CardContent, CardActions } from '@mui/material';
import { Edit, Delete, AutoAwesome } from '@mui/icons-material';

/**
 * 文章列表展示组件（纯渲染）
 */
export default function ArticleList({
  articles,
  loading,
  onEdit,
  onDelete,
  onAnalyze,
}) {
  // 加载状态
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 空状态
  if (articles.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="text.secondary">暂无文章</Typography>
      </Box>
    );
  }

  // 文章列表
  return (
    <Box>
      {articles.map((article) => (
        <Card key={article.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{article.title}</Typography>
            {article.summary && (
              <Typography variant="body2" color="text.secondary">
                {article.summary}
              </Typography>
            )}
          </CardContent>
          <CardActions>
            <Tooltip title="编辑">
              <IconButton
                aria-label="编辑"
                onClick={() => onEdit(article)}
              >
                <Edit />
              </IconButton>
            </Tooltip>
            <Tooltip title="AI 分析">
              <IconButton
                aria-label="AI 分析"
                onClick={() => onAnalyze(article)}
              >
                <AutoAwesome />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton
                aria-label="删除"
                onClick={() => onDelete(article.id)}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleList.test.jsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/admin/components/articles/
git commit -m "feat: add ArticleList component with tests"
```

---

### Task 5: 创建 ArticleEditor 组件（TDD）

**Files:**
- Create: `frontend/src/admin/components/articles/ArticleEditor.jsx`
- Create: `frontend/src/admin/components/articles/ArticleEditor.test.jsx`

**Step 1: 创建测试文件**

```javascript
// frontend/src/admin/components/articles/ArticleEditor.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleEditor from './ArticleEditor';

describe('ArticleEditor', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    content: 'Test Content',
    summary: 'Test Summary',
  };

  const defaultProps = {
    open: false,
    article: null,
    onSave: vi.fn().mockResolvedValue({}),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('open=false 时不应该显示对话框', () => {
    render(<ArticleEditor {...defaultProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true 时应该显示对话框', () => {
    render(<ArticleEditor {...defaultProps} open={true} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('新建文章')).toBeInTheDocument();
  });

  it('有 article 时应该显示编辑标题', () => {
    render(<ArticleEditor {...defaultProps} open={true} article={mockArticle} />);

    expect(screen.getByText('编辑文章')).toBeInTheDocument();
  });

  it('应该用 article 数据初始化表单', async () => {
    render(<ArticleEditor {...defaultProps} open={true} article={mockArticle} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Article')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
    });
  });

  it('标题为空时应该显示验证错误', async () => {
    render(<ArticleEditor {...defaultProps} open={true} />);

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/标题不能为空/)).toBeInTheDocument();
    });
  });

  it('保存时应该调用 onSave', async () => {
    render(<ArticleEditor {...defaultProps} open={true} />);

    // 填写表单
    fireEvent.change(screen.getByLabelText(/标题/), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByLabelText(/内容/), { target: { value: 'New Content' } });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith({
        title: 'New Title',
        content: 'New Content',
        summary: '',
      });
    });
  });

  it('取消时应该调用 onClose', () => {
    render(<ArticleEditor {...defaultProps} open={true} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleEditor.test.jsx`
Expected: FAIL - 组件不存在

**Step 3: 实现组件**

```jsx
// frontend/src/admin/components/articles/ArticleEditor.jsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material';

/**
 * 文章编辑对话框（纯渲染 + 局部表单状态）
 */
export default function ArticleEditor({ open, article, onSave, onClose }) {
  // 局部表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        content: article.content || '',
        summary: article.summary || '',
      });
    } else {
      setFormData({ title: '', content: '', summary: '' });
    }
    setErrors({});
  }, [article, open]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空';
    }
    if (!formData.content.trim()) {
      newErrors.content = '内容不能为空';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // 错误由父组件处理
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{article ? '编辑文章' : '新建文章'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="标题"
            value={formData.title}
            onChange={handleChange('title')}
            error={!!errors.title}
            helperText={errors.title}
            fullWidth
          />
          <TextField
            label="内容"
            value={formData.content}
            onChange={handleChange('content')}
            error={!!errors.content}
            helperText={errors.content}
            multiline
            rows={6}
            fullWidth
          />
          <TextField
            label="摘要"
            value={formData.summary}
            onChange={handleChange('summary')}
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleEditor.test.jsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/admin/components/articles/
git commit -m "feat: add ArticleEditor component with tests"
```

---

### Task 6: 创建 AiAnalyzer 组件（TDD）

**Files:**
- Create: `frontend/src/admin/components/articles/AiAnalyzer.jsx`
- Create: `frontend/src/admin/components/articles/AiAnalyzer.test.jsx`

**Step 1: 创建测试文件**

```javascript
// frontend/src/admin/components/articles/AiAnalyzer.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiAnalyzer from './AiAnalyzer';

describe('AiAnalyzer', () => {
  const mockArticle = { id: 1, title: 'Test Article' };
  const mockAnalysis = {
    summary: 'AI Summary',
    keywords: ['keyword1', 'keyword2'],
  };

  const defaultProps = {
    open: false,
    article: null,
    analysis: null,
    loading: false,
    onAnalyze: vi.fn(),
    onClose: vi.fn(),
  };

  it('open=false 时不应该显示对话框', () => {
    render(<AiAnalyzer {...defaultProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true 时应该显示对话框', () => {
    render(<AiAnalyzer {...defaultProps} open={true} article={mockArticle} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/AI 分析/)).toBeInTheDocument();
  });

  it('loading 时应该显示加载状态', () => {
    render(<AiAnalyzer {...defaultProps} open={true} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('有分析结果时应该显示结果', () => {
    render(
      <AiAnalyzer
        {...defaultProps}
        open={true}
        analysis={mockAnalysis}
      />
    );

    expect(screen.getByText('AI Summary')).toBeInTheDocument();
  });

  it('无分析结果时应该显示开始分析按钮', () => {
    render(
      <AiAnalyzer
        {...defaultProps}
        open={true}
        article={mockArticle}
      />
    );

    const analyzeButton = screen.getByText(/开始分析/);
    fireEvent.click(analyzeButton);

    expect(defaultProps.onAnalyze).toHaveBeenCalled();
  });

  it('关闭按钮应该调用 onClose', () => {
    render(<AiAnalyzer {...defaultProps} open={true} />);

    const closeButton = screen.getByText('关闭');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/admin/components/articles/AiAnalyzer.test.jsx`
Expected: FAIL - 组件不存在

**Step 3: 实现组件**

```jsx
// frontend/src/admin/components/articles/AiAnalyzer.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

/**
 * AI 分析对话框（纯渲染）
 */
export default function AiAnalyzer({
  open,
  article,
  analysis,
  loading,
  onAnalyze,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome />
          AI 分析 {article && `- ${article.title}`}
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress aria-label="分析中" role="progressbar" />
          </Box>
        ) : analysis ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {analysis.summary && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  摘要
                </Typography>
                <Typography variant="body1">{analysis.summary}</Typography>
              </Box>
            )}
            {analysis.keywords && analysis.keywords.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  关键词
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {analysis.keywords.map((keyword, index) => (
                    <Chip key={index} label={keyword} size="small" />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              点击下方按钮开始 AI 分析
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoAwesome />}
              onClick={onAnalyze}
            >
              开始分析
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/admin/components/articles/AiAnalyzer.test.jsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/admin/components/articles/
git commit -m "feat: add AiAnalyzer component with tests"
```

---

### Task 7: 创建 ArticleImporter 组件（TDD）

**Files:**
- Create: `frontend/src/admin/components/articles/ArticleImporter.jsx`
- Create: `frontend/src/admin/components/articles/ArticleImporter.test.jsx`

**Step 1: 创建测试文件**

```javascript
// frontend/src/admin/components/articles/ArticleImporter.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleImporter from './ArticleImporter';

describe('ArticleImporter', () => {
  const defaultProps = {
    open: false,
    onImport: vi.fn().mockResolvedValue({ success: 2, failed: 0 }),
    onClose: vi.fn(),
  };

  it('open=false 时不应该显示对话框', () => {
    render(<ArticleImporter {...defaultProps} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true 时应该显示对话框', () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/批量导入/)).toBeInTheDocument();
  });

  it('关闭按钮应该调用 onClose', () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    const closeButton = screen.getByText('关闭');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('导入时应该调用 onImport', async () => {
    render(<ArticleImporter {...defaultProps} open={true} />);

    // 模拟选择文件
    const file = new File(['content'], 'test.md', { type: 'text/markdown' });
    const input = screen.getByLabelText(/选择文件/);
    fireEvent.change(input, { target: { files: [file] } });

    // 点击导入
    const importButton = screen.getByText('导入');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(defaultProps.onImport).toHaveBeenCalled();
    });
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleImporter.test.jsx`
Expected: FAIL - 组件不存在

**Step 3: 实现组件**

```jsx
// frontend/src/admin/components/articles/ArticleImporter.jsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Upload } from '@mui/icons-material';

/**
 * 文章批量导入对话框
 */
export default function ArticleImporter({ open, onImport, onClose }) {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setResults(null);
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    try {
      const result = await onImport(files);
      setResults(result);
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>批量导入文章</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
          >
            选择文件
            <input
              type="file"
              hidden
              multiple
              accept=".md,.markdown,.txt"
              onChange={handleFileChange}
              aria-label="选择文件"
            />
          </Button>
        </Box>

        {files.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              已选择 {files.length} 个文件：
            </Typography>
            <List dense>
              {files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemText primary={file.name} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {importing && <LinearProgress />}

        {results && (
          <Box sx={{ mt: 2 }}>
            {results.error ? (
              <Typography color="error">{results.error}</Typography>
            ) : (
              <Typography color="success.main">
                导入成功：{results.success} 篇，失败：{results.failed} 篇
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>关闭</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={files.length === 0 || importing}
        >
          导入
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/admin/components/articles/ArticleImporter.test.jsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/admin/components/articles/
git commit -m "feat: add ArticleImporter component with tests"
```

---

### Task 8: 创建子组件统一导出

**Files:**
- Create: `frontend/src/admin/components/articles/index.js`

**Step 1: 创建索引文件**

```javascript
// frontend/src/admin/components/articles/index.js
export { default as ArticleList } from './ArticleList';
export { default as ArticleEditor } from './ArticleEditor';
export { default as AiAnalyzer } from './AiAnalyzer';
export { default as ArticleImporter } from './ArticleImporter';
```

**Step 2: Commit**

```bash
git add frontend/src/admin/components/articles/index.js
git commit -m "feat: add articles components index"
```

---

## Phase 3: 容器层重构

### Task 9: 重构 ArticlesManager 容器组件（TDD）

**Files:**
- Modify: `frontend/src/admin/components/ArticlesManager.jsx`
- Create: `frontend/src/admin/components/ArticlesManager.test.jsx`

**Step 1: 创建测试文件**

```javascript
// frontend/src/admin/components/ArticlesManager.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticlesManager from './ArticlesManager';

// Mock Store
vi.mock('@/stores/articleStore', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import useArticleStore from '@/stores/articleStore';

// Mock 子组件
vi.mock('./articles', () => ({
  ArticleList: ({ articles, onEdit, onDelete, onAnalyze }) => (
    <div data-testid="article-list">
      {articles.map((a) => (
        <div key={a.id}>
          <span>{a.title}</span>
          <button onClick={() => onEdit(a)}>Edit</button>
          <button onClick={() => onDelete(a.id)}>Delete</button>
          <button onClick={() => onAnalyze(a)}>Analyze</button>
        </div>
      ))}
    </div>
  ),
  ArticleEditor: ({ open, article, onSave, onClose }) => (
    <div data-testid="article-editor" data-open={open}>
      {open && (
        <>
          <span>{article ? 'Edit' : 'Create'}</span>
          <button onClick={() => onSave({ title: 'Test' })}>Save</button>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
  AiAnalyzer: ({ open, article, onAnalyze, onClose }) => (
    <div data-testid="ai-analyzer" data-open={open}>
      {open && (
        <>
          <span>Analyze: {article?.title}</span>
          <button onClick={onAnalyze}>Start</button>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
  ArticleImporter: ({ open, onImport, onClose }) => (
    <div data-testid="article-importer" data-open={open}>
      {open && (
        <>
          <button onClick={() => onImport([])}>Import</button>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
}));

describe('ArticlesManager', () => {
  const mockArticles = [
    { id: 1, title: 'Article 1' },
    { id: 2, title: 'Article 2' },
  ];

  const mockStore = {
    articles: mockArticles,
    loading: false,
    error: null,
    aiAnalysis: null,
    aiLoading: false,
    fetchArticles: vi.fn().mockResolvedValue(),
    createArticle: vi.fn().mockResolvedValue({ id: 3 }),
    updateArticle: vi.fn().mockResolvedValue(),
    deleteArticle: vi.fn().mockResolvedValue(),
    analyzeArticle: vi.fn().mockResolvedValue({ summary: 'test' }),
    clearAiAnalysis: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useArticleStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  it('应该渲染文章列表', async () => {
    render(<ArticlesManager />);

    expect(screen.getByTestId('article-list')).toBeInTheDocument();
    expect(screen.getByText('Article 1')).toBeInTheDocument();
  });

  it('应该在新按钮点击时打开编辑器', async () => {
    render(<ArticlesManager />);

    const createButton = screen.getByText('新建文章');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  it('应该在编辑按钮点击时打开编辑器并传入文章', async () => {
    render(<ArticlesManager />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('应该在保存时调用 createArticle', async () => {
    render(<ArticlesManager />);

    // 打开新建对话框
    fireEvent.click(screen.getByText('新建文章'));

    // 点击保存
    await waitFor(() => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(mockStore.createArticle).toHaveBeenCalled();
  });

  it('应该在删除按钮点击时调用 deleteArticle', async () => {
    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ArticlesManager />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockStore.deleteArticle).toHaveBeenCalledWith(1);
    });
  });

  it('应该在 AI 分析按钮点击时打开分析器', async () => {
    render(<ArticlesManager />);

    const analyzeButtons = screen.getAllByText('Analyze');
    fireEvent.click(analyzeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Analyze:/)).toBeInTheDocument();
    });
  });
});
```

**Step 2: 备份原文件**

```bash
cp frontend/src/admin/components/ArticlesManager.jsx frontend/src/admin/components/ArticlesManager.jsx.backup
```

**Step 3: 运行测试确认失败**

Run: `cd frontend && npm run test -- src/admin/components/ArticlesManager.test.jsx`
Expected: FAIL - 组件结构不匹配

**Step 4: 重构组件**

```jsx
// frontend/src/admin/components/ArticlesManager.jsx
import { useState, useEffect } from 'react';
import { Box, Button, Snackbar, Alert } from '@mui/material';
import { Add, Upload } from '@mui/icons-material';

// Store
import useArticleStore from '@/stores/articleStore';

// 子组件
import {
  ArticleList,
  ArticleEditor,
  AiAnalyzer,
  ArticleImporter,
} from './articles';

/**
 * 文章管理容器组件
 * 职责：UI 状态管理、子组件组合、事件协调
 */
export default function ArticlesManager() {
  // ========== Store 状态 ==========
  const {
    articles,
    loading,
    error,
    aiAnalysis,
    aiLoading,
    fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    analyzeArticle,
    clearAiAnalysis,
  } = useArticleStore();

  // ========== UI 状态（局部）==========
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [analyzingArticle, setAnalyzingArticle] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // ========== 初始化 ==========
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ========== 事件处理 ==========
  const handleCreate = () => {
    setEditingArticle(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setEditDialogOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, formData);
        showSnackbar('文章更新成功', 'success');
      } else {
        await createArticle(formData);
        showSnackbar('文章创建成功', 'success');
      }
    } catch (err) {
      showSnackbar(err.message, 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该文章？')) return;
    try {
      await deleteArticle(id);
      showSnackbar('文章删除成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleAnalyze = async (article) => {
    setAnalyzingArticle(article);
    setAiDialogOpen(true);
    clearAiAnalysis();
    try {
      await analyzeArticle(article.id);
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleImport = async (files) => {
    // TODO: 实现批量导入逻辑
    console.log('Import files:', files);
    return { success: files.length, failed: 0 };
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ========== 渲染 ==========
  return (
    <Box>
      {/* 工具栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          新建文章
        </Button>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
        >
          批量导入
        </Button>
      </Box>

      {/* 文章列表 */}
      <ArticleList
        articles={articles}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAnalyze={handleAnalyze}
      />

      {/* 编辑对话框 */}
      <ArticleEditor
        open={editDialogOpen}
        article={editingArticle}
        onSave={handleSave}
        onClose={() => setEditDialogOpen(false)}
      />

      {/* AI 分析对话框 */}
      <AiAnalyzer
        open={aiDialogOpen}
        article={analyzingArticle}
        analysis={aiAnalysis}
        loading={aiLoading}
        onAnalyze={() => analyzeArticle(analyzingArticle?.id)}
        onClose={() => setAiDialogOpen(false)}
      />

      {/* 批量导入对话框 */}
      <ArticleImporter
        open={importDialogOpen}
        onImport={handleImport}
        onClose={() => setImportDialogOpen(false)}
      />

      {/* 全局提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
```

**Step 5: 运行测试确认通过**

Run: `cd frontend && npm run test -- src/admin/components/ArticlesManager.test.jsx`
Expected: PASS - 所有测试通过

**Step 6: 删除备份文件**

```bash
rm frontend/src/admin/components/ArticlesManager.jsx.backup
```

**Step 7: Commit**

```bash
git add frontend/src/admin/components/ArticlesManager.jsx frontend/src/admin/components/ArticlesManager.test.jsx
git commit -m "refactor: rewrite ArticlesManager with new architecture"
```

---

## Phase 4: 集成测试与清理

### Task 10: 运行完整测试套件

**Step 1: 运行所有测试**

Run: `cd frontend && npm run test`
Expected: PASS - 所有测试通过

**Step 2: 运行 lint**

Run: `cd frontend && npm run lint`
Expected: 无错误

**Step 3: 构建验证**

Run: `cd frontend && npm run build`
Expected: 构建成功

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify all tests pass after refactor"
```

---

### Task 11: 标记 useApi 为 deprecated

**Files:**
- Modify: `frontend/src/hooks/useApi.js`

**Step 1: 添加 deprecated 注释**

```javascript
// frontend/src/hooks/useApi.js
/**
 * @deprecated 此 Hook 已废弃，请使用 stores/articleStore.js 配合 utils/apiClient.js
 * 迁移指南：
 * - 使用 useArticleStore() 获取状态和操作方法
 * - 使用 api.get/post/put/del 进行 API 调用
 */
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useApi.js
git commit -m "docs: mark useApi as deprecated"
```

---

## 验收标准

| 标准 | 验证方式 |
|------|---------|
| 所有测试通过 | `npm run test` |
| Lint 无错误 | `npm run lint` |
| 构建成功 | `npm run build` |
| ArticlesManager < 200 行 | 代码审查 |
| 无直接 fetch 调用 | Grep 搜索 |
| Store 测试覆盖 > 80% | 测试报告 |

## 回滚计划

如遇重大问题，可按以下步骤回滚：

```bash
# 查看提交历史
git log --oneline

# 回滚到重构前
git revert <commit-hash>
```

## 参考资源

- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- 设计文档: `docs/plans/2025-03-25-frontend-refactor-design.md`
