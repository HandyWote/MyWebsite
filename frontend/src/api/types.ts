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
  url?: string;
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
