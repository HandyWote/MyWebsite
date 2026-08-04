// frontend/src/stores/uploadStore.js
import { create } from 'zustand';
import { api, uploadFile, API_ENDPOINTS } from '@/config/api';

const {
  ARTICLE_COVER,
  ARTICLE_PDF_UPLOAD,
  ARTICLE_IMPORT_MD,
} = API_ENDPOINTS.ADMIN;

const useUploadStore = create((set) => ({
  coverPreview: null,
  coverUploading: false,
  pdfUploading: false,

  uploadCover: async (file) => {
    set({ coverUploading: true });
    try {
      const data = await uploadFile(ARTICLE_COVER, file);
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
      const data = await uploadFile(ARTICLE_PDF_UPLOAD, file);
      const filename = data.filename;
      set({ pdfUploading: false });
      return filename;
    } catch (err) {
      set({ pdfUploading: false });
      throw err;
    }
  },

  importMarkdown: (files) => api.uploadFiles(ARTICLE_IMPORT_MD, files, 'files'),

  resetUploads: () => set({
    coverPreview: null,
    coverUploading: false,
    pdfUploading: false,
  }),
}));

export default useUploadStore;
