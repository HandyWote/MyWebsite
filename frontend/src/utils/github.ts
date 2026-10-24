import type { GitHubRepo, Project } from '@/api/types';

/** 默认用户名：配置为空或非法时的兜底（与线上默认配置一致）。 */
const DEFAULT_GITHUB_USERNAME = 'HandyWote';

/**
 * 归一化 GitHub 用户名：接受裸用户名或仓库/用户 URL，返回用户名段。
 * 非法/空输入回退到默认用户名。
 */
export function normalizeGitHubUsername(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_GITHUB_USERNAME;
  }

  const input = value.trim();
  if (!input) {
    return DEFAULT_GITHUB_USERNAME;
  }

  let source = input;
  try {
    const parsed = new URL(input);
    source = parsed.pathname;
  } catch {
    // keep original input when it is already a username
  }

  const withoutQuery = source.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  return segments[segments.length - 1] || input;
}

// ==================== GitHub 仓库拉取 + 本地缓存 ====================

const GITHUB_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

/** 本地缓存条目：拉取时间戳 + 原始 repo 列表。 */
export interface GithubCacheEntry {
  timestamp: number;
  data: GitHubRepo[];
}

/** 拉取参数：排序字段与单页条数（GitHub REST API 单页上限 100）。 */
export interface FetchGithubReposOptions {
  sort?: string;
  perPage?: number;
}

export const buildGithubCacheKey = (
  username: string,
  sort: string,
  perPage: number,
): string => `github_repos:${username}:${sort}:${perPage}`;

const getBrowserStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

const isGithubRepoArray = (value: unknown): value is GitHubRepo[] => Array.isArray(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const isGithubCacheEntry = (value: unknown): value is GithubCacheEntry =>
  isRecord(value) && typeof value.timestamp === 'number' && isGithubRepoArray(value.data);

/**
 * 读本地缓存：缺失、JSON 损坏、形状不对一律返回 null（调用方自行决定重新拉取）。
 */
export const readGithubCache = (cacheKey: string): GithubCacheEntry | null => {
  try {
    const storage = getBrowserStorage();
    if (!storage) return null;
    const raw = storage.getItem(cacheKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isGithubCacheEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeGithubCache = (cacheKey: string, data: GitHubRepo[]): void => {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(
    cacheKey,
    JSON.stringify({
      timestamp: Date.now(),
      data,
    }),
  );
};

/**
 * GitHub API repo → 项目卡片 DTO。
 *
 * `updatedAt` 是相对时间文案（today / yesterday / Nd ago / Nw ago / Nmo ago），
 * 由 `now` 与 `repo.updated_at` 的差值决定。
 */
export function mapGithubRepoToProject(repo: GitHubRepo, now: Date = new Date()): Project {
  const updatedAt = new Date(repo.updated_at);
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relativeUpdatedAt: string;
  if (diffDays === 0) relativeUpdatedAt = 'today';
  else if (diffDays === 1) relativeUpdatedAt = 'yesterday';
  else if (diffDays < 7) relativeUpdatedAt = `${diffDays}d ago`;
  else if (diffDays < 30) relativeUpdatedAt = `${Math.floor(diffDays / 7)}w ago`;
  else relativeUpdatedAt = `${Math.floor(diffDays / 30)}mo ago`;

  return {
    id: repo.id,
    name: repo.name,
    description: repo.description || '暂无描述',
    tags: repo.topics?.slice(0, 3) || (repo.language ? [repo.language] : []),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: relativeUpdatedAt,
    url: repo.html_url,
  };
}

/** 批量映射并按 star 数降序（项目页默认展示顺序）。 */
export const mapGithubReposToProjects = (repos: readonly GitHubRepo[]): Project[] =>
  repos.map((repo) => mapGithubRepoToProject(repo)).sort((a, b) => b.stars - a.stars);

async function fetchGithubPage(
  username: string,
  sort: string,
  perPage: number,
  page: number,
): Promise<GitHubRepo[]> {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?sort=${sort}&per_page=${perPage}&page=${page}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HandyWote-Portfolio',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('GitHub API returned an invalid repository list');
  }
  return payload as GitHubRepo[];
}

/**
 * 拉取用户全部 GitHub 仓库（分页循环），带 3 小时本地缓存。
 * 返回原始 repo 对象数组；失败时抛出异常，由调用方决定降级策略。
 */
export async function fetchGithubRepos(
  username: string,
  { sort = 'updated', perPage = 30 }: FetchGithubReposOptions = {},
): Promise<GitHubRepo[]> {
  const cacheKey = buildGithubCacheKey(username, sort, perPage);
  const cached = readGithubCache(cacheKey);
  if (cached && Date.now() - cached.timestamp < GITHUB_CACHE_TTL_MS) {
    return cached.data;
  }

  let page = 1;
  let allRepos: GitHubRepo[] = [];

  // GitHub REST API 单页最多 100 条，这里循环拉取直到最后一页
  while (true) {
    const pageRepos = await fetchGithubPage(username, sort, perPage, page);
    allRepos = allRepos.concat(pageRepos);

    if (pageRepos.length < perPage) {
      break;
    }

    page += 1;
  }

  writeGithubCache(cacheKey, allRepos);
  return allRepos;
}
