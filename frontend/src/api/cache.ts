export const CACHE_TTL = {
  publicData: 24 * 60 * 60,
  projects: 3 * 60 * 60,
} as const;

export const CACHE_TAGS = {
  articleList: 'articles:list',
  sitemap: 'sitemap',
  siteBlocks: 'site-blocks',
  profile: 'profile',
  projects: 'projects',
} as const;

export type DataCachePolicy = {
  revalidate: number;
  tags: string[];
};

export function articleCacheTag(id: string | number): string {
  return `article:${id}`;
}

export function publicDataPolicy(...tags: string[]): DataCachePolicy {
  return { revalidate: CACHE_TTL.publicData, tags };
}

export const projectsCachePolicy: DataCachePolicy = {
  revalidate: CACHE_TTL.projects,
  tags: [CACHE_TAGS.projects],
};
