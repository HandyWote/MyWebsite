// frontend/src/stores/uploadStore.ts
import { create } from 'zustand';
import { uploadApi } from '@/api/uploadApi';
import type { ArticleImportStats } from '@/api/types';

export interface UploadState {
  /** 封面预览地址（上传成功后的服务端 url）；null 表示未选封面。 */
  coverPreview: string | null;
  coverUploading: boolean;
  pdfUploading: boolean;

  /** 上传封面，成功返回预览地址；失败复位 uploading 并抛出。 */
  uploadCover: (file: File) => Promise<string>;
  /** 上传 PDF，成功返回文件名；失败复位 uploading 并抛出。 */
  uploadPdf: (file: File) => Promise<string>;
  /** 批量导入 Markdown/PDF，返回后端统计。 */
  importMarkdown: (files: File[]) => Promise<ArticleImportStats>;
  resetUploads: () => void;
}

const useUploadStore = create<UploadState>()((set) => ({
  coverPreview: null,
  coverUploading: false,
  pdfUploading: false,

  uploadCover: async (file) => {
    set({ coverUploading: true });
    try {
      const data = await uploadApi.cover(file);
      const url = data.url;
      set({ coverPreview: url, coverUploading: false });
      return url;
    } catch (err) {
      set({ coverUploading: false });
      throw err;
    }
  },

  uploadPdf: async (file) => {
    set({ pdfUploading: true });
    try {
      const data = await uploadApi.pdf(file);
      const filename = data.filename;
      set({ pdfUploading: false });
      return filename;
    } catch (err) {
      set({ pdfUploading: false });
      throw err;
    }
  },

  importMarkdown: (files) => uploadApi.markdown(files),

  resetUploads: () => set({
    coverPreview: null,
    coverUploading: false,
    pdfUploading: false,
  }),
}));

export default useUploadStore;
