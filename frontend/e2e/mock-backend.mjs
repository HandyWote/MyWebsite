import http from 'node:http';

const port = Number(process.env.MOCK_BACKEND_PORT || 5187);

const siteBlocks = [
  {
    id: 1,
    name: 'home',
    content: {
      title: 'HandyWote',
      subtitle: '少年侠气交结五都雄！',
      github_calendar_url: 'https://github.com/HandyWote',
    },
  },
  {
    id: 2,
    name: 'sidebar',
    content: {
      social_links: [],
      education: [],
      tech_stack: [{ name: 'Next.js' }, { name: 'Three.js' }],
    },
  },
  {
    id: 3,
    name: 'articles_page',
    content: {
      title: '~/articles',
      subtitle: 'Selected notes from the workstation.',
      empty_text: 'no articles',
    },
  },
  {
    id: 4,
    name: 'projects_page',
    content: {
      title: '~/projects',
      subtitle: 'Open source projects.',
      github_username: 'HandyWote',
      sort: 'updated',
      per_page: 100,
      error_text: 'Unable to load projects',
    },
  },
];

const articles = [
  {
    id: 101,
    title: '3D DOM Fusion Notes',
    summary: 'A deterministic article fixture for the public 3D screen.',
    category: 'Engineering',
    tags: ['next', 'three'],
    read_time: '4 min',
    created_at: '2026-08-04T00:00:00Z',
    updated_at: '2026-08-04T00:00:00Z',
    content_type: 'markdown',
  },
  {
    id: 102,
    title: 'Progressive Scene Loading',
    summary: 'Models and textures can appear independently.',
    category: 'Graphics',
    tags: ['webgl'],
    read_time: '3 min',
    created_at: '2026-08-03T00:00:00Z',
    updated_at: '2026-08-03T00:00:00Z',
    content_type: 'markdown',
  },
];

function envelope(data) {
  return JSON.stringify({ code: 0, data });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(typeof body === 'string' ? body : envelope(body));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/api/site-blocks') {
    sendJson(response, 200, siteBlocks);
    return;
  }

  if (url.pathname === '/api/avatars') {
    sendJson(response, 200, []);
    return;
  }

  if (url.pathname === '/api/articles') {
    const page = Number(url.searchParams.get('page') || 1);
    const perPage = Number(url.searchParams.get('per_page') || 10);
    const start = (page - 1) * perPage;
    sendJson(response, 200, {
      items: articles.slice(start, start + perPage),
      total: articles.length,
      page,
      per_page: perPage,
    });
    return;
  }

  const articleMatch = url.pathname.match(/^\/api\/articles\/(\d+)$/);
  if (articleMatch) {
    const article = articles.find((item) => item.id === Number(articleMatch[1]));
    if (!article) {
      sendJson(response, 404, JSON.stringify({ code: 404, msg: 'not found' }));
      return;
    }
    sendJson(response, 200, {
      ...article,
      content: `# ${article.title}\n\nThis article is rendered from the e2e fixture backend.`,
      views: 0,
    });
    return;
  }

  sendJson(response, 404, JSON.stringify({ code: 404, msg: `unhandled ${url.pathname}` }));
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`mock backend listening on ${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
