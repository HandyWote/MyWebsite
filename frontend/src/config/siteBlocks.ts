export const SITE_BLOCK_DEFAULTS = {
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

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const getBlockContent = (blocks, name) => {
  const defaults = SITE_BLOCK_DEFAULTS[name] || {};
  const found = (blocks || []).find((block) => block?.name === name);

  if (!found || !isObject(found.content)) {
    return { ...defaults };
  }

  return {
    ...defaults,
    ...found.content,
  };
};
