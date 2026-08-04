import 'server-only';

import { getBlockContent, SITE_BLOCK_DEFAULTS } from '@/config/siteBlocks';
import { API_ENDPOINTS } from './endpoints';
import { serverRequest } from './server';
import type { Article, ArticlePage, Avatar, GitHubRepo, Project, SiteBlock } from './types';

const DEFAULT_AVATAR = '/avatar.webp';
const MAX_GITHUB_REPO_PAGES = 100;

export async function getPublicProfile() {
  try {
    const [blocks, avatars] = await Promise.all([
      serverRequest<SiteBlock[]>(API_ENDPOINTS.PUBLIC.SITE_BLOCKS),
      serverRequest<Avatar[]>(API_ENDPOINTS.PUBLIC.AVATARS),
    ]);
    const currentAvatar = avatars.find((avatar) => avatar.is_current);
    return {
      home: getBlockContent(blocks, 'home'),
      sidebar: getBlockContent(blocks, 'sidebar'),
      avatarUrl: currentAvatar ? API_ENDPOINTS.PUBLIC.AVATAR_FILE(currentAvatar.filename) : DEFAULT_AVATAR,
    };
  } catch {
    return {
      home: { ...SITE_BLOCK_DEFAULTS.home },
      sidebar: { ...SITE_BLOCK_DEFAULTS.sidebar },
      avatarUrl: DEFAULT_AVATAR,
    };
  }
}

export async function getArticlePage(page = 1, perPage = 10): Promise<ArticlePage> {
  return serverRequest<ArticlePage>(`${API_ENDPOINTS.PUBLIC.ARTICLES}?page=${page}&per_page=${perPage}`);
}

export async function getArticle(id: string): Promise<Article> {
  return serverRequest<Article>(API_ENDPOINTS.PUBLIC.ARTICLE_DETAIL(id));
}

export async function getArticlesPageConfig() {
  try {
    const blocks = await serverRequest<SiteBlock[]>(API_ENDPOINTS.PUBLIC.SITE_BLOCKS);
    return getBlockContent(blocks, 'articles_page');
  } catch {
    return { ...SITE_BLOCK_DEFAULTS.articles_page };
  }
}

export function formatServerDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
}

function mapRepo(repo: GitHubRepo): Project {
  return {
    id: repo.id,
    name: repo.name,
    description: repo.description || '暂无描述',
    tags: repo.topics?.slice(0, 3) || (repo.language ? [repo.language] : []),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: formatServerDate(repo.updated_at),
    url: repo.html_url,
  };
}

async function fetchGitHubRepoPage(username: string, sort: string, perPage: number, page: number): Promise<GitHubRepo[]> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=${encodeURIComponent(sort)}&per_page=${perPage}&page=${page}`, {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'HandyWote-Portfolio' },
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  const repos = await response.json() as unknown;
  if (!Array.isArray(repos)) throw new Error('GitHub API returned an invalid repository list');
  return repos as GitHubRepo[];
}

export async function getProjects() {
  let config = { ...SITE_BLOCK_DEFAULTS.projects_page };
  try {
    const blocks = await serverRequest<SiteBlock[]>(API_ENDPOINTS.PUBLIC.SITE_BLOCKS);
    config = getBlockContent(blocks, 'projects_page') as typeof config;
  } catch {
    // The configured defaults keep the projects page useful when profile data is unavailable.
  }
  const username = String(config.github_username || SITE_BLOCK_DEFAULTS.projects_page.github_username);
  const sort = String(config.sort || SITE_BLOCK_DEFAULTS.projects_page.sort);
  const perPage = Math.min(100, Math.max(1, Number(config.per_page) || 100));
  try {
    const repos: GitHubRepo[] = [];
    for (let page = 1; page <= MAX_GITHUB_REPO_PAGES; page += 1) {
      const pageRepos = await fetchGitHubRepoPage(username, sort, perPage, page);
      repos.push(...pageRepos);
      if (pageRepos.length < perPage) break;
    }
    return { config, projects: repos.map(mapRepo).sort((a, b) => b.stars - a.stars), error: '' };
  } catch (error) {
    return { config, projects: [], error: error instanceof Error ? error.message : String(config.error_text) };
  }
}
