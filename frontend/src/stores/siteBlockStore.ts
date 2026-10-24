// frontend/src/stores/siteBlockStore.ts
import { create } from 'zustand';
import { unwrapApiPayload } from '@/api/browser';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '@/config/siteBlocks';
import { siteBlockApi } from '@/api/siteBlockApi';
import { withLoading } from '@/api/withLoading';
import type {
  HomeContent,
  SiteBlock,
  SiteBlockForm,
  SiteBlockPayload,
} from '@/api/types';

const HOME_FIELD_KEYS = ['title', 'subtitle', 'github_calendar_url'] as const;

/**
 * 只挑 home 块里前台真实生效的三个字段，其余字段（author/github_url 等）不进入表单，
 * 避免后台保存时把无效旧配置写回线上。
 */
const pickHomeFields = (source: HomeContent = {}): HomeContent =>
  HOME_FIELD_KEYS.reduce<HomeContent>((acc, key) => {
    acc[key] = source[key] ?? SITE_BLOCK_DEFAULTS.home[key] ?? '';
    return acc;
  }, {});

const createInitialForm = (): SiteBlockForm => ({
  home: pickHomeFields(SITE_BLOCK_DEFAULTS.home),
  sidebar: { ...SITE_BLOCK_DEFAULTS.sidebar },
});

const normalizeBlocksToForm = (blocks: SiteBlock[]): SiteBlockForm => {
  const home: HomeContent = getBlockContent(blocks, 'home');
  return {
    home: pickHomeFields(home),
    sidebar: getBlockContent(blocks, 'sidebar'),
  };
};

export interface SiteBlockState {
  blocks: SiteBlock[];
  form: SiteBlockForm;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** 首次拉取是否成功过：false 时 form 只是代码默认值，保存会覆盖线上真实数据。 */
  loaded: boolean;

  fetchBlocks: () => Promise<SiteBlock[]>;
  updateForm: (updater: SiteBlockForm | ((prev: SiteBlockForm) => SiteBlockForm)) => void;
  saveBlocks: () => Promise<void>;
}

const useSiteBlockStore = create<SiteBlockState>()((set, get) => ({
  blocks: [],
  form: createInitialForm(),
  loading: false,
  saving: false,
  error: null,
  loaded: false,

  fetchBlocks: async () => {
    try {
      return await withLoading(set, 'loading', 'error', async () => {
        const data = await siteBlockApi.fetchBlocks();
        const blocks: SiteBlock[] = unwrapApiPayload(data) || [];
        set({ blocks, form: normalizeBlocksToForm(blocks), loaded: true });
        return blocks;
      });
    } catch (error) {
      // 拉取失败（含重试失败）后表单不可信，保存必须重新上锁。
      set({ loaded: false });
      throw error;
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
    // 未成功拉取过线上数据时禁止保存：此时 form 是代码默认值，PUT 上去就是覆盖线上真实配置。
    if (!get().loaded) {
      throw new Error('配置尚未加载成功，已阻止保存以免覆盖线上数据');
    }

    await withLoading(set, 'saving', 'error', async () => {
      const { form } = get();
      const payload: SiteBlockPayload = {
        blocks: [
          { name: 'home', content: pickHomeFields(form.home) },
          { name: 'sidebar', content: form.sidebar },
        ],
      };
      await siteBlockApi.saveBlocks(payload);
    });
  },
}));

export { pickHomeFields };
export default useSiteBlockStore;
