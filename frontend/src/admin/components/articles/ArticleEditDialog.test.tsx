import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ArticleEditDialog from './ArticleEditDialog';

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
  default: (selector) => selector(articleState),
}));

vi.mock('@/stores/uploadStore', () => ({
  default: () => uploadState,
}));

vi.mock('@/stores/aiStore', () => ({
  default: () => aiState,
}));

vi.mock('../../../hooks/useNotification', () => ({
  default: () => ({
    notify: () => ({
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    }),
  }),
}));

vi.mock('./MarkdownUploadPreview', () => ({
  default: ({ content, onContentChange }) => (
    <div>
      <span data-testid="markdown-content">{content}</span>
      <button type="button" onClick={() => onContentChange('new markdown')}>
        Change Markdown
      </button>
    </div>
  ),
}));

vi.mock('./PdfUploadPreview', () => ({
  default: ({ filename, onClear }) => (
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
