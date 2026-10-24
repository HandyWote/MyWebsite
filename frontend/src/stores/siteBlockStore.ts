// frontend/src/stores/siteBlockStore.js
import { create } from 'zustand';
import { unwrapApiPayload } from '@/config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '@/config/siteBlocks';
import { siteBlockApi } from '@/api/siteBlockApi';
import { withLoading } from '@/api/withLoading';

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

  fetchBlocks: async () =>
    withLoading(set, 'loading', 'error', async () => {
      const data = await siteBlockApi.fetchBlocks();
      const blocks = unwrapApiPayload(data) || [];
      set({ blocks, form: normalizeBlocksToForm(blocks) });
    }),

  updateForm: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ form: updater(state.form) }));
    } else {
      set({ form: updater });
    }
  },

  saveBlocks: async () =>
    withLoading(set, 'saving', 'error', async () => {
      const { form } = get();
      const payload = {
        blocks: [
          { name: 'home', content: pickHomeFields(form.home) },
          { name: 'sidebar', content: form.sidebar },
        ],
      };
      await siteBlockApi.saveBlocks(payload);
    }),
}));

export { pickHomeFields };
export default useSiteBlockStore;
