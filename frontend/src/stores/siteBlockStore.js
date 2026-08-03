// frontend/src/stores/siteBlockStore.js
import { create } from 'zustand';
import { api, API_ENDPOINTS, unwrapApiPayload } from '@/config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '@/config/siteBlocks';

const HOME_FIELD_KEYS = ['title', 'subtitle', 'github_calendar_url'];

const pickHomeFields = (source = {}) => HOME_FIELD_KEYS.reduce((acc, key) => {
  acc[key] = source[key] ?? SITE_BLOCK_DEFAULTS.home[key] ?? '';
  return acc;
}, {});

const createInitialForm = () => ({
  home: pickHomeFields(SITE_BLOCK_DEFAULTS.home),
  sidebar: { ...SITE_BLOCK_DEFAULTS.sidebar },
});

const normalizeBlocksToForm = (blocks) => ({
  home: pickHomeFields(getBlockContent(blocks, 'home')),
  sidebar: getBlockContent(blocks, 'sidebar'),
});

const useSiteBlockStore = create((set, get) => ({
  blocks: [],
  form: createInitialForm(),
  loading: false,
  saving: false,
  error: null,

  fetchBlocks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(API_ENDPOINTS.ADMIN.SITE_BLOCKS);
      const blocks = unwrapApiPayload(data) || [];
      set({ blocks, form: normalizeBlocksToForm(blocks), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateForm: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ form: updater(state.form) }));
    } else {
      set({ form: updater });
    }
  },

  saveBlocks: async () => {
    const { form } = get();
    set({ saving: true, error: null });
    try {
      const payload = {
        blocks: [
          { name: 'home', content: pickHomeFields(form.home) },
          { name: 'sidebar', content: form.sidebar },
        ],
      };
      await api.put(API_ENDPOINTS.ADMIN.SITE_BLOCKS, payload);
      set({ saving: false });
    } catch (err) {
      set({ error: err.message, saving: false });
      throw err;
    }
  },
}));

export { pickHomeFields };
export default useSiteBlockStore;
