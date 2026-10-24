/**
 * admin 页族的边界类型（只声明「前台真实生效」的形状）。
 *
 * 用途：`@/stores/siteBlockStore`、`@/stores/avatarStore` 仍是 JS（Zustand 在无类型
 * 参数时把 store 导成 unknown/any），本文件给出消费侧需要的具体形状，让页族在
 * 边界处 `as unknown as` 一次性收口，组件内部不出现 any。
 *
 * 字段与前台渲染对齐：写在 form 里的字段必须是前台真正会读的字段，
 * 新建项只带这些字段，避免后台存下无效果的旧配置。
 */

/** 社交图标类型：必须与前台 `components/sidebar/SocialLinks` 的 iconMap 完全对齐。 */
export type SocialLinkType = 'github' | 'email' | 'wechat' | 'qq' | 'phone' | 'other';

export interface SocialLink {
  type?: SocialLinkType | string;
  label?: string;
  href?: string;
}

/** 教育经历（前台只渲染 school/period）。 */
export interface EducationItem {
  school?: string;
  period?: string;
}

/** 技术栈（前台只渲染 name）。 */
export interface TechStackItem {
  name?: string;
}

export interface SidebarContent {
  social_links: SocialLink[];
  education: EducationItem[];
  tech_stack: TechStackItem[];
}

export interface HomeContent {
  title?: string;
  subtitle?: string;
  github_calendar_url?: string;
}

/** 左侧内容栏表单：只有 home 与 sidebar 两块（其余块不在此页维护）。 */
export interface SiteBlockForm {
  home: HomeContent;
  sidebar: SidebarContent;
}

/** 头像列表项：url 由 store 依据 filename 生成，uploaded_at 后端返回。 */
export interface AvatarItem {
  id: number;
  filename: string;
  is_current?: boolean;
  url?: string;
  uploaded_at?: string;
}
