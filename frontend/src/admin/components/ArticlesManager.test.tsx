import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ArticlesManager from './ArticlesManager';
import type { ArticleSummary } from '@/api/types';
import type { ArticleListProps } from './articles/ArticleList';
import type { ArticleImporterProps } from './articles/ArticleImporter';
import type { ArticleEditDialogProps } from './articles/ArticleEditDialog';
import type { AiSettingsDialogProps } from './articles/AiSettingsDialog';

// Mock PDF.js 相关依赖（必须在导入组件前）
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('@/components/PdfViewerOnCanvas', () => ({
  default: () => null,
}));

// Mock Stores（用 hoisted Mock 句柄，避免对 zustand store 函数做 mockImplementation）
const { useArticleStoreMock, useUploadStoreMock, useAiStoreMock } = vi.hoisted(() => ({
  useArticleStoreMock: vi.fn(),
  useUploadStoreMock: vi.fn(),
  useAiStoreMock: vi.fn(),
}));

vi.mock('@/stores/articleStore', () => ({
  __esModule: true,
  default: useArticleStoreMock,
}));

vi.mock('@/stores/uploadStore', () => ({
  __esModule: true,
  default: useUploadStoreMock,
}));

vi.mock('@/stores/aiStore', () => ({
  __esModule: true,
  default: useAiStoreMock,
}));

// Mock useNotification（扁平 API：notify.success / notify.error，无 .notify() 链式壳）
const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../../hooks/useNotification', () => ({
  default: () => ({
    success: notifySuccess,
    error: notifyError,
    info: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

// Mock 子组件
vi.mock('./articles', () => ({
  ArticleList: ({ articles, onEdit, onDelete, selectedIds, onSelectionChange, onRowsPerPageChange }: ArticleListProps) => (
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
  ArticleImporter: ({ open, onImport, onClose }: ArticleImporterProps) => (
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

// Mock ArticleEditDialog — 现在只有 5 个 props
vi.mock('./articles/ArticleEditDialog', () => ({
  default: ({ open, onSave, onClose }: ArticleEditDialogProps) => (
    <div data-testid="article-editor" data-open={open}>
      {open && (
        <>
          <span>Edit Dialog</span>
          <button
            onClick={() => onSave({
              title: 'Test',
              category: '',
              tags: '',
              summary: '',
              content: 'content',
              content_type: 'markdown',
              cover: '',
              pdf_filename: '',
            })}
          >
            Save
          </button>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
}));

// Mock AiSettingsDialog
vi.mock('./articles/AiSettingsDialog', () => ({
  default: ({ open, onClose }: AiSettingsDialogProps) => (
    <div data-testid="ai-settings-dialog" data-open={open}>
      {open && <span>AI Settings</span>}
      <button onClick={onClose}>Close Settings</button>
    </div>
  ),
}));

describe('ArticlesManager', () => {
  const mockArticles: ArticleSummary[] = [
    { id: 1, title: 'Article 1', tags: ['tag1'] },
    { id: 2, title: 'Article 2', tags: ['tag2'] },
  ];

  const mockArticleStore = {
    articles: mockArticles,
    loading: false,
    error: null,
    pagination: { page: 1, perPage: 10, total: 2 },
    fetchArticles: vi.fn().mockResolvedValue(undefined),
    fetchArticleById: vi.fn().mockResolvedValue(mockArticles[0]),
    createArticle: vi.fn().mockResolvedValue({ id: 3 }),
    updateArticle: vi.fn().mockResolvedValue(undefined),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
    batchDeleteArticles: vi.fn().mockResolvedValue(undefined),
  };

  const mockUploadStore = {
    coverPreview: null,
    coverUploading: false,
    pdfUploading: false,
    uploadCover: vi.fn().mockResolvedValue('/cover.jpg'),
    uploadPdf: vi.fn().mockResolvedValue('doc.pdf'),
    importMarkdown: vi.fn().mockResolvedValue({ markdown: 1 }),
    resetUploads: vi.fn(),
  };

  const mockAiStore = {
    aiAnalysis: null,
    aiSuggestions: null,
    loading: false,
    settingsLoading: false,
  };

  const createStoreMock = <T extends object>(store: T) =>
    (selector?: (state: T) => unknown) => {
      if (typeof selector === 'function') {
        return selector(store);
      }
      return store;
    };

  beforeEach(() => {
    vi.clearAllMocks();
    useArticleStoreMock.mockImplementation(createStoreMock(mockArticleStore));
    useUploadStoreMock.mockImplementation(createStoreMock(mockUploadStore));
    useAiStoreMock.mockImplementation(createStoreMock(mockAiStore));
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
      expect(mockArticleStore.fetchArticleById).toHaveBeenCalledWith(1);
    });
  });

  it('应该在删除按钮点击时弹出带文案的确认对话框', async () => {
    render(<ArticlesManager />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // PixelConfirmDialog（替代 window.confirm / 后台手搓 ConfirmDialog）
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: '确认删除' })).toBeInTheDocument();
    expect(within(dialog).getByText('确定删除该文章？')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('应该在确认删除后调用 deleteArticle 并关闭确认框', async () => {
    render(<ArticlesManager />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '确认删除' }));

    await waitFor(() => {
      expect(mockArticleStore.deleteArticle).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(notifySuccess).toHaveBeenCalledWith('文章删除成功');
  });

  it('删除失败时应通过通知上报错误', async () => {
    mockArticleStore.deleteArticle.mockRejectedValueOnce(new Error('删除失败'));
    render(<ArticlesManager />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '确认删除' }));

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('删除失败');
    });
  });

  it('应该在批量删除按钮点击时弹出批量确认文案', async () => {
    render(<ArticlesManager />);

    // 先选中一篇文章
    fireEvent.click(screen.getByTestId('select-1'));

    // 点击批量删除
    const batchDeleteButton = screen.getByText(/删除选中/);
    fireEvent.click(batchDeleteButton);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('批量删除确认')).toBeInTheDocument();
    expect(within(dialog).getByText('确定删除选中的 1 篇文章？')).toBeInTheDocument();
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
    expect(mockArticleStore.fetchArticles).toHaveBeenCalled();
  });

  it('切换每页条数时应回到第一页', async () => {
    render(<ArticlesManager />);
    fireEvent.click(screen.getByText('RowsPerPage'));

    await waitFor(() => {
      expect(mockArticleStore.fetchArticles).toHaveBeenCalledWith({ page: 1, perPage: 25 });
    });
  });
});
