// frontend/src/stores/uploadStore.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useUploadStore from './uploadStore';

vi.mock('@/config/api', () => {
  const adminEndpoints = {
    ARTICLE_COVER: '/api/admin/articles/cover',
    ARTICLE_PDF_UPLOAD: '/api/admin/articles/pdf/upload',
    ARTICLE_IMPORT_MD: '/api/admin/articles/import-md',
  };
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
      upload: vi.fn(),
      uploadFiles: vi.fn(),
    },
    uploadFile: vi.fn(),
    API_ENDPOINTS: {
      PUBLIC: {},
      ADMIN: adminEndpoints,
    },
    default: {
      API_ENDPOINTS: {
        PUBLIC: {},
        ADMIN: adminEndpoints,
      },
    },
  };
});

import { uploadFile, api, API_ENDPOINTS } from '@/config/api';

global.fetch = vi.fn();

describe('uploadStore', () => {
  beforeEach(() => {
    useUploadStore.getState().resetUploads();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useUploadStore.getState();
      expect(state.coverPreview).toBe(null);
      expect(state.coverUploading).toBe(false);
      expect(state.pdfUploading).toBe(false);
    });
  });

  describe('uploadCover', () => {
    it('应该成功上传封面', async () => {
      const mockFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
      uploadFile.mockResolvedValueOnce({ url: '/uploads/cover.jpg' });

      const result = await act(async () => {
        return await useUploadStore.getState().uploadCover(mockFile);
      });

      expect(result).toBe('/uploads/cover.jpg');
      expect(useUploadStore.getState().coverPreview).toBe('/uploads/cover.jpg');
      expect(useUploadStore.getState().coverUploading).toBe(false);
    });

    it('应该处理上传失败', async () => {
      const mockFile = new File(['test'], 'cover.jpg', { type: 'image/jpeg' });
      uploadFile.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(
        act(async () => {
          await useUploadStore.getState().uploadCover(mockFile);
        })
      ).rejects.toThrow('Upload failed');

      expect(useUploadStore.getState().coverUploading).toBe(false);
    });
  });

  describe('uploadPdf', () => {
    it('应该成功上传PDF', async () => {
      const mockFile = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      uploadFile.mockResolvedValueOnce({ filename: 'doc.pdf' });

      const result = await act(async () => {
        return await useUploadStore.getState().uploadPdf(mockFile);
      });

      expect(result).toBe('doc.pdf');
      expect(useUploadStore.getState().pdfUploading).toBe(false);
    });

    it('应该处理上传失败', async () => {
      const mockFile = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      uploadFile.mockRejectedValueOnce(new Error('PDF upload failed'));

      await expect(
        act(async () => {
          await useUploadStore.getState().uploadPdf(mockFile);
        })
      ).rejects.toThrow('PDF upload failed');

      expect(useUploadStore.getState().pdfUploading).toBe(false);
    });
  });

  describe('importMarkdown', () => {
    it('应该通过 api.uploadFiles 上传文件', async () => {
      api.uploadFiles.mockResolvedValueOnce({ markdown: 1, pdf: 0, failed: [] });

      const files = [new File(['# hello'], 'a.md', { type: 'text/markdown' })];
      const result = await act(async () => {
        return await useUploadStore.getState().importMarkdown(files);
      });

      expect(result).toEqual({ markdown: 1, pdf: 0, failed: [] });
      expect(api.uploadFiles).toHaveBeenCalledWith(
        API_ENDPOINTS.ADMIN.ARTICLE_IMPORT_MD,
        files,
        'files',
      );
    });

    it('应该处理导入失败', async () => {
      api.uploadFiles.mockRejectedValueOnce(new Error('Import failed'));

      const files = [new File(['# hello'], 'a.md', { type: 'text/markdown' })];
      await expect(
        act(async () => {
          await useUploadStore.getState().importMarkdown(files);
        })
      ).rejects.toThrow('Import failed');
    });
  });

  describe('resetUploads', () => {
    it('应该重置所有上传状态', () => {
      useUploadStore.setState({
        coverPreview: '/uploads/test.jpg',
        coverUploading: true,
        pdfUploading: true,
      });

      useUploadStore.getState().resetUploads();

      const state = useUploadStore.getState();
      expect(state.coverPreview).toBe(null);
      expect(state.coverUploading).toBe(false);
      expect(state.pdfUploading).toBe(false);
    });
  });
});
