// frontend/src/stores/uploadStore.js
import { create } from 'zustand';
import { uploadApi } from '@/api/uploadApi';

const useUploadStore = create((set) => ({
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
