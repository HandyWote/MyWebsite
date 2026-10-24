import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useUploadStore from './uploadStore';
import { uploadApi } from '@/api/uploadApi';

vi.mock('@/api/uploadApi', () => ({
  uploadApi: { cover: vi.fn(), pdf: vi.fn(), markdown: vi.fn() },
}));

describe('uploadStore', () => {
  beforeEach(() => {
    useUploadStore.getState().resetUploads();
    vi.clearAllMocks();
  });

  it('应该有正确的初始状态', () => {
    expect(useUploadStore.getState()).toMatchObject({ coverPreview: null, coverUploading: false, pdfUploading: false });
  });

  it('应该通过 upload 领域 API 上传封面', async () => {
    const file = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
    uploadApi.cover.mockResolvedValue({ url: '/uploads/cover.jpg' });
    const result = await act(async () => useUploadStore.getState().uploadCover(file));
    expect(uploadApi.cover).toHaveBeenCalledWith(file);
    expect(result).toBe('/uploads/cover.jpg');
    expect(useUploadStore.getState().coverPreview).toBe('/uploads/cover.jpg');
  });

  it('封面上传失败时复位 loading', async () => {
    uploadApi.cover.mockRejectedValue(new Error('Upload failed'));
    await expect(useUploadStore.getState().uploadCover(new File(['x'], 'x.jpg'))).rejects.toThrow('Upload failed');
    expect(useUploadStore.getState().coverUploading).toBe(false);
  });

  it('应该通过 upload 领域 API 上传 PDF', async () => {
    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    uploadApi.pdf.mockResolvedValue({ filename: 'doc.pdf' });
    const result = await act(async () => useUploadStore.getState().uploadPdf(file));
    expect(uploadApi.pdf).toHaveBeenCalledWith(file);
    expect(result).toBe('doc.pdf');
  });

  it('PDF 上传失败时复位 loading', async () => {
    uploadApi.pdf.mockRejectedValue(new Error('PDF upload failed'));
    await expect(useUploadStore.getState().uploadPdf(new File(['x'], 'x.pdf'))).rejects.toThrow('PDF upload failed');
    expect(useUploadStore.getState().pdfUploading).toBe(false);
  });

  it('应该通过 upload 领域 API 导入 Markdown', async () => {
    const files = [new File(['# hello'], 'a.md', { type: 'text/markdown' })];
    uploadApi.markdown.mockResolvedValue({ markdown: 1, pdf: 0, failed: [] });
    const result = await act(async () => useUploadStore.getState().importMarkdown(files));
    expect(uploadApi.markdown).toHaveBeenCalledWith(files);
    expect(result).toEqual({ markdown: 1, pdf: 0, failed: [] });
  });

  it('应该传递 Markdown 导入失败', async () => {
    uploadApi.markdown.mockRejectedValue(new Error('Import failed'));
    await expect(useUploadStore.getState().importMarkdown([])).rejects.toThrow('Import failed');
  });

  it('应该重置所有上传状态', () => {
    useUploadStore.setState({ coverPreview: '/uploads/test.jpg', coverUploading: true, pdfUploading: true });
    useUploadStore.getState().resetUploads();
    expect(useUploadStore.getState()).toMatchObject({ coverPreview: null, coverUploading: false, pdfUploading: false });
  });
});
