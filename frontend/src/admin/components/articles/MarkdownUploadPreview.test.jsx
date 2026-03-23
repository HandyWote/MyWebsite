import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownUploadPreview from './MarkdownUploadPreview';

describe('MarkdownUploadPreview', () => {
  it('renders markdown upload controls and loaded-content hint', () => {
    render(
      <MarkdownUploadPreview
        content={'# Title\n\n```js\nconsole.log(1)\n```'}
        previewContent={'# Title\n\n```js\nconsole.log(1)\n```'}
        onContentChange={() => {}}
        onPreviewContentChange={() => {}}
        onError={() => {}}
      />,
    );

    expect(screen.getByText('Markdown 文件')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择 Markdown 文件' })).toBeInTheDocument();
    expect(screen.getByText('已加载数据库中的正文内容，如需替换请上传新的 Markdown 文件。')).toBeInTheDocument();
  });
});
