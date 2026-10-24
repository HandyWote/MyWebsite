import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArticleEditDialog from './ArticleEditDialog';
import type { MarkdownUploadPreviewProps } from './MarkdownUploadPreview';
import type { PdfUploadPreviewProps } from './PdfUploadPreview';

const { articleState, uploadState, aiState } = vi.hoisted(() => ({
  articleState: {
    loading: false,
  },
  uploadState: {
    coverUploading: false,
    pdfUploading: false,
    uploadCover: vi.fn(),
    uploadPdf: vi.fn(),
  },
  aiState: {
    aiSuggestions: null,
    loading: false,
    analyzeContent: vi.fn(),
    applySuggestions: vi.fn(),
  },
}));

vi.mock('@/stores/articleStore', () => ({
  default: (selector: (state: { loading: boolean }) => unknown) => selector(articleState),
}));

vi.mock('@/stores/uploadStore', () => ({
  default: () => uploadState,
}));

vi.mock('@/stores/aiStore', () => ({
  default: () => aiState,
}));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../../../hooks/useNotification', () => ({
  default: () => ({
    success: notifySuccess,
    error: notifyError,
    info: vi.fn(),
    warning: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

vi.mock('./MarkdownUploadPreview', () => ({
  default: ({ content, onContentChange }: MarkdownUploadPreviewProps) => (
    <div>
      <span data-testid="markdown-content">{content}</span>
      <button type="button" onClick={() => onContentChange('new markdown')}>
        Change Markdown
      </button>
    </div>
  ),
}));

vi.mock('./PdfUploadPreview', () => ({
  default: ({ filename, onClear }: PdfUploadPreviewProps) => (
    <div>
      <span data-testid="pdf-filename">{filename}</span>
      <button type="button" onClick={onClear}>
        Clear PDF
      </button>
    </div>
  ),
}));

describe('ArticleEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadState.uploadCover.mockResolvedValue('/cover.jpg');
    uploadState.uploadPdf.mockResolvedValue('doc.pdf');
  });

  it('渲染像素弹窗标题与操作按钮', () => {
    render(
      <ArticleEditDialog
        open={true}
        isEdit={false}
        article={{}}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('新增文章')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('封面上传按钮背后的 hidden input 可达并触发上传', async () => {
    render(
      <ArticleEditDialog
        open={true}
        isEdit={true}
        article={{ title: 'Existing Article', content_type: 'markdown' }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const fileInput = screen.getByText('上传封面').closest('label')?.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    expect(fileInput).toHaveAttribute('accept', 'image/*');

    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => expect(uploadState.uploadCover).toHaveBeenCalledWith(file));
  });

  it('keeps markdown content when switching to pdf before saving', () => {
    const onSave = vi.fn();

    render(
      <ArticleEditDialog
        open={true}
        isEdit={true}
        article={{
          title: 'Existing Article',
          content: 'existing markdown',
          content_type: 'markdown',
          pdf_filename: 'existing.pdf',
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /PDF 文件/ }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      content_type: 'pdf',
      content: 'existing markdown',
      pdf_filename: 'existing.pdf',
    }));
    expect(screen.queryByText('确认切换内容类型')).not.toBeInTheDocument();
  });

  it('keeps pdf filename when switching to markdown before saving', () => {
    const onSave = vi.fn();

    render(
      <ArticleEditDialog
        open={true}
        isEdit={true}
        article={{
          title: 'PDF Article',
          content: 'existing markdown',
          content_type: 'pdf',
          pdf_filename: 'existing.pdf',
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Markdown 文本/ }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      content_type: 'markdown',
      content: 'existing markdown',
      pdf_filename: 'existing.pdf',
    }));
    expect(screen.queryByText('确认切换内容类型')).not.toBeInTheDocument();
  });
});
