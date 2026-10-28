export type SiteBlockName = 'home' | 'sidebar' | 'articles_page' | 'projects_page' | 'global_ui';

export interface SiteBlock {
  id?: number;
  name: SiteBlockName | string;
  content: Record<string, unknown>;
}

export interface Avatar {
  id: number;
  filename: string;
  is_current?: boolean;
  /** 由 avatarStore 依据 filename 生成的展示地址。 */
  url?: string;
  /** 后端 Avatar.UploadedAt，列表接口原样返回。 */
  uploaded_at?: string;
}

export interface ArticleSummary {
  id: number;
  title: string;
  summary?: string;
  category?: string;
  tags?: string[] | string;
  read_time?: string;
  created_at?: string;
  updated_at?: string;
  cover?: string;
  cover_url?: string;
  content_type?: 'markdown' | 'pdf' | string;
  pdf_filename?: string;
  pdf_url?: string;
}

export interface Article extends ArticleSummary {
  content?: string;
  views?: number;
}

export interface ArticlePage {
  items?: ArticleSummary[];
  articles?: ArticleSummary[];
  total?: number;
  page?: number;
  per_page?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  topics?: string[];
  language?: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  tags: string[];
  stars: number;
  forks: number;
  updatedAt: string;
  url: string;
}

/** 文章列表分页状态（后台 store 的 pagination，page 为 1 基）。 */
export interface ArticlePagination {
  page: number;
  perPage: number;
  total: number;
}

/**
 * 后台文章表单值：ArticleInput 的全字符串版本（编辑对话框与容器之间的形状）。
 *
 * tags 是逗号分隔字符串（后端接受数组或字符串，表单里只维护字符串）；
 * id 只在编辑模式下携带，用于重置对话框本地状态，不进入请求体。
 */
export interface ArticleFormValues {
  id?: number;
  title: string;
  category: string;
  tags: string;
  summary: string;
  content: string;
  content_type: string;
  cover: string;
  pdf_filename: string;
}

/** 批量导入统计（ADMIN.ARTICLE_IMPORT_MD 响应；failed 为失败条目明细）。 */
export interface ArticleImportStats {
  markdown?: number;
  pdf?: number;
  failed?: unknown[];
}

/** 文章写入载荷（创建/更新共用）：字段与 ADMIN.ARTICLES 的请求体一致。 */
export interface ArticleInput {
  title: string;
  category?: string;
  tags?: string[] | string;
  summary?: string;
  content?: string;
  content_type?: 'markdown' | 'pdf' | string;
  cover?: string;
  pdf_filename?: string;
}

/**
 * 评论（PUBLIC.ARTICLE_COMMENTS 的 items / ADMIN.ADMIN_COMMENTS 的行）。
 * user_agent 只由后台管理端读出（评论详情对话框），前台不展示。
 */
export interface Comment {
  id: number;
  author: string;
  content: string;
  email?: string;
  avatar_url?: string;
  status?: string;
  ip_address?: string;
  user_agent?: string;
  article_title?: string;
  created_at?: string;
}

/** 评论列表响应：ADMIN.ADMIN_COMMENTS 与 PUBLIC.ARTICLE_COMMENTS 同形。 */
export interface CommentPage {
  comments?: Comment[];
  total?: number;
}

/** 新建评论请求体（身份来自会话，匿名不可提交）。 */
export interface CommentInput {
  author: string;
  email?: string;
  avatar_url?: string;
  content: string;
}

/** AI 分析建议（ADMIN.ARTICLE_AI_ANALYZE 的 data）。 */
export interface AiSuggestions {
  category?: string;
  suggested_summary?: string;
  summary?: string;
  tags?: string[] | string;
}

/** AI 设置（ADMIN.AI_SETTINGS 的 data；api_key 永远回空，只有掩码）。 */
export interface AiSettings {
  id?: number;
  prompt?: string;
  model?: string;
  base_url?: string;
  api_key?: string;
  api_key_masked?: string;
  created_at?: string;
  updated_at?: string;
}

/** 站点内容保存载荷：ADMIN.SITE_BLOCKS 的 PUT 请求体。 */
export interface SiteBlockPayload {
  blocks: Array<{ name: string; content: Record<string, unknown> }>;
}

/** 社交图标类型：必须与前台 `components/sidebar/SocialLinks` 的 iconMap 完全对齐。 */
export type SocialLinkType = 'github' | 'email' | 'wechat' | 'qq' | 'phone' | 'other';

/** 侧边栏社交链接（前台读取 type/label/href）。 */
export interface SocialLink {
  type?: SocialLinkType | string;
  label?: string;
  href?: string;
}

/** 经历条目（前台渲染 school/period/points；字段沿用 education，历史数据无 points 也兼容）。 */
export interface EducationItem {
  school?: string;
  period?: string;
  /** 要点行（实习/项目成果，每条一行）。 */
  points?: string[];
}

/** 技术栈（前台只渲染 name）。 */
export interface TechStackItem {
  name?: string;
}

/**
 * 左侧内容栏 sidebar 块内容：数组顺序即前台渲染顺序。
 *
 * 三个数组都可缺省（历史数据可能只存了其中一块），消费侧一律按 `数组 || []` 读取。
 */
export type SidebarContent = {
  social_links?: SocialLink[];
  education?: EducationItem[];
  tech_stack?: TechStackItem[];
};

/**
 * 左侧内容栏 home 块内容。
 *
 * 前三个字段（title/subtitle/github_calendar_url）是后台表单维护、前台真实生效的字段；
 * author/github_url/contact_description 只存在于默认值里（历史字段，后台保存时会被丢弃），
 * 声明出来是为了让 `SITE_BLOCK_DEFAULTS.home` 能用同一份形状类型。
 */
export type HomeContent = {
  title?: string;
  subtitle?: string;
  github_calendar_url?: string;
  author?: string;
  github_url?: string;
  contact_description?: string;
};

/**
 * 文章列表页块内容（与 `SITE_BLOCK_DEFAULTS.articles_page` 一致）。
 *
 * 缺字段由默认值补齐，因此读取侧拿到的永远是完整对象。
 */
export type ArticlesPageContent = {
  title: string;
  subtitle: string;
  empty_text: string;
};

/** 项目页块内容（与 `SITE_BLOCK_DEFAULTS.projects_page` 一致）。 */
export type ProjectsPageContent = {
  github_username: string;
  per_page: number;
  sort: string;
  empty_text: string;
  error_text: string;
};

/** 全站 UI 文案块内容：目前无键约定，保留开放记录以免固化成错误形状。 */
export type GlobalUiContent = Record<string, unknown>;

/** 后台「左侧内容栏」表单值：只有 home 与 sidebar 两块（其余块不在此页维护）。 */
export type SiteBlockForm = {
  home: HomeContent;
  sidebar: SidebarContent;
};

/**
 * 全站备份数据集（ADMIN.EXPORT 响应 / ADMIN.IMPORT 请求体）。
 *
 * 后端 ExportDataSet 原样透传文章行，字段比 ArticleSummary 更宽（含 content、
 * 时间戳等），前端只做搬运不做解释，因此按开放记录声明而不裁剪成窄类型。
 */
export interface ExportDataSet {
  articles: Array<Record<string, unknown>>;
  siteBlocks: SiteBlock[];
}
