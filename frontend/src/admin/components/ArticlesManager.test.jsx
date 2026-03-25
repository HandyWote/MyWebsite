import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticlesManager from './ArticlesManager';

// Mock PDF.js 相关依赖（必须在导入组件前）
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('@/components/PdfViewerOnCanvas', () => ({
  default: () => null,
}));

// Mock Store
vi.mock('@/stores/articleStore', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import useArticleStore from '@/stores/articleStore';

// Mock 子组件
vi.mock('./articles', () => ({
  ArticleList: ({ articles, onEdit, onDelete, selectedIds, onSelectionChange, onRowsPerPageChange }) => (
    <div data-testid="article-list">
      <button onClick={() => onRowsPerPageChange?.(25)}>RowsPerPage</button>
      {articles.map((a) => (
        <div key={a.id}>
          <span>{a.title}</span>
          <button onClick={() => onEdit(a)}>Edit</button>
          <button onClick={() => onDelete(a.id)}>Delete</button>
          <input
            type="checkbox"
            checked={selectedIds?.includes(a.id)}
            onChange={() => onSelectionChange?.([a.id])}
            data-testid={`select-${a.id}`}
          />
        </div>
      ))}
    </div>
  ),
  ArticleEditDialog: ({ open, article, onSave, onClose }) => (
    <div data-testid="article-editor" data-open={open}>
      {open && (
        <>
          <span>{article?.id ? 'Edit' : 'Create'}</span>
          <button onClick={() => onSave({ title: 'Test' })}>Save</button>
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

// Mock ArticleEditDialog 子模块
vi.mock('./articles/ArticleEditDialog', () => ({
  default: ({ open, onSave, onClose }) => (
    <div data-testid="article-editor" data-open={open}>
      {open && (
        <>
          <span>Edit Dialog</span>
          <button onClick={() => onSave({ title: 'Test' })}>Save</button>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
}));

// Mock AiSettingsDialog
vi.mock('./articles/AiSettingsDialog', () => ({
  default: ({ open, onClose }) => (
    <div data-testid="ai-settings-dialog" data-open={open}>
      {open && <span>AI Settings</span>}
      <button onClick={onClose}>Close Settings</button>
    </div>
  ),
}));

describe('ArticlesManager', () => {
  const mockArticles = [
    { id: 1, title: 'Article 1', tags: ['tag1'] },
    { id: 2, title: 'Article 2', tags: ['tag2'] },
  ];

  const mockStore = {
    articles: mockArticles,
    loading: false,
    error: null,
    pagination: { page: 1, perPage: 10, total: 2 },
    aiAnalysis: null,
    aiLoading: false,
    aiSettings: null,
    aiSettingsLoading: false,
    fetchArticles: vi.fn().mockResolvedValue(),
    fetchArticleById: vi.fn().mockResolvedValue(mockArticles[0]),
    createArticle: vi.fn().mockResolvedValue({ id: 3 }),
    updateArticle: vi.fn().mockResolvedValue(),
    deleteArticle: vi.fn().mockResolvedValue(),
    batchDeleteArticles: vi.fn().mockResolvedValue(),
    uploadCover: vi.fn().mockResolvedValue('/cover.jpg'),
    uploadPdf: vi.fn().mockResolvedValue('doc.pdf'),
    importMarkdown: vi.fn().mockResolvedValue({ markdown: 1 }),
    analyzeContent: vi.fn().mockResolvedValue({ summary: 'test' }),
    clearAiAnalysis: vi.fn(),
    fetchAiSettings: vi.fn().mockResolvedValue({}),
    updateAiSettings: vi.fn().mockResolvedValue({}),
    testAiConnection: vi.fn().mockResolvedValue({}),
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
      expect(screen.getByText('Edit Dialog')).toBeInTheDocument();
    });
  });

  it('应该在编辑按钮点击时获取文章详情', async () => {
    render(<ArticlesManager />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(mockStore.fetchArticleById).toHaveBeenCalledWith(1);
    });
  });

  it('应该在删除按钮点击时调用 deleteArticle', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ArticlesManager />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockStore.deleteArticle).toHaveBeenCalledWith(1);
    });
  });

  it('应该打开批量导入对话框', async () => {
    render(<ArticlesManager />);

    const importButton = screen.getByText('批量导入');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByTestId('article-importer')).toHaveAttribute('data-open', 'true');
    });
  });

  it('应该打开 AI 设置对话框', async () => {
    render(<ArticlesManager />);

    const settingsButton = screen.getByText('AI 设置');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('AI Settings')).toBeInTheDocument();
    });
  });

  it('应该初始化时获取文章列表', () => {
    render(<ArticlesManager />);
    expect(mockStore.fetchArticles).toHaveBeenCalled();
  });

  it('切换每页条数时应回到第一页', async () => {
    render(<ArticlesManager />);
    fireEvent.click(screen.getByText('RowsPerPage'));

    await waitFor(() => {
      expect(mockStore.fetchArticles).toHaveBeenCalledWith({ page: 1, perPage: 25 });
    });
  });
});
