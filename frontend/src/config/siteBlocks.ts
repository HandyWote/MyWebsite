/**
 * 站点内容块（site blocks）默认值与读取工具。
 *
 * 这里是真实配置来源：后端 site_blocks 表存同形状 JSON，块缺失或字段缺失时
 * 一律回落到本文件的默认值。内容形状类型统一定义在 `@/api/types`
 * （后台表单与前台消费共用一份），本文件只负责「默认值 + 按 name 取块」。
 */
import type {
  ArticlesPageContent,
  GlobalUiContent,
  HomeContent,
  ProjectsPageContent,
  SidebarContent,
} from '@/api/types';

export type {
  ArticlesPageContent,
  GlobalUiContent,
  HomeContent,
  ProjectsPageContent,
  SidebarContent,
};

/** 请求/缓存里一个块的最小可读形状：`content` 可能是历史脏数据，读取时做运行时校验。 */
export interface SiteBlockInput {
  name?: string;
  content?: unknown;
}

/** name → 该块内容形状；`getBlockContent` 按 name 返回对应类型而不是宽泛的 unknown。 */
export interface SiteBlockContentMap {
  home: HomeContent;
  sidebar: SidebarContent;
  articles_page: ArticlesPageContent;
  projects_page: ProjectsPageContent;
  global_ui: GlobalUiContent;
}

export type SiteBlockContentName = keyof SiteBlockContentMap;

export const SITE_BLOCK_DEFAULTS: SiteBlockContentMap = {
  home: {
    title: 'HandyWote',
    subtitle: '少年侠气交结五都雄！',
    author: '汕头大学 | 黄应辉',
    github_url: 'https://github.com/HandyWote',
    github_calendar_url: 'https://ghchart.rshah.org/HandyWote',
    contact_description: '',
  },
  sidebar: {
    social_links: [],
    education: [],
    tech_stack: [],
  },
  articles_page: {
    title: '~/articles',
    subtitle: '',
    empty_text: 'No articles found.',
  },
  projects_page: {
    github_username: 'HandyWote',
    per_page: 100,
    sort: 'updated',
    empty_text: 'No projects found.',
    error_text: 'Failed to fetch projects.',
  },
  global_ui: {},
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** 默认值打底、线上内容覆盖（Object.assign 与对象展开等价，但不丢泛型类型）。 */
const mergeOverrides = <T extends object>(
  defaults: T,
  overrides?: Record<string, unknown>,
): T => Object.assign({}, defaults, overrides);

/**
 * 取某个块的内容：块缺失、`content` 不是对象（历史脏数据）时返回默认值副本，
 * 否则返回「默认值 + 线上内容」的浅合并结果。返回值按 name 收窄到对应内容类型。
 */
export const getBlockContent = <K extends SiteBlockContentName>(
  blocks: readonly SiteBlockInput[] | null | undefined,
  name: K,
): SiteBlockContentMap[K] => {
  const found = (blocks ?? []).find((block) => block?.name === name);

  if (!found || !isObject(found.content)) {
    return mergeOverrides(SITE_BLOCK_DEFAULTS[name]);
  }

  return mergeOverrides(SITE_BLOCK_DEFAULTS[name], found.content);
};
