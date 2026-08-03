export function normalizeGitHubUsername(value) {
  if (typeof value !== 'string') {
    return 'HandyWote';
  }

  const input = value.trim();
  if (!input) {
    return 'HandyWote';
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

export const buildGithubCacheKey = (username, sort, perPage) =>
  `github_repos:${username}:${sort}:${perPage}`;

const getBrowserStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export const readGithubCache = (cacheKey) => {
  try {
    const storage = getBrowserStorage();
    if (!storage) return null;
    const raw = storage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.timestamp !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeGithubCache = (cacheKey, data) => {
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

async function fetchGithubPage(username, sort, perPage, page) {
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
  return response.json();
}

/**
 * 拉取用户全部 GitHub 仓库（分页循环），带 3 小时本地缓存。
 * 返回原始 repo 对象数组；失败时抛出异常，由调用方决定降级策略。
 */
export async function fetchGithubRepos(username, { sort = 'updated', perPage = 30 } = {}) {
  const cacheKey = buildGithubCacheKey(username, sort, perPage);
  const cached = readGithubCache(cacheKey);
  if (cached && Date.now() - cached.timestamp < GITHUB_CACHE_TTL_MS) {
    return cached.data;
  }

  let page = 1;
  let allRepos = [];

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
