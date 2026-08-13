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

// --- P1 auth mock 状态 ---

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin-pass';
const GITHUB_TOKEN = 'mock-github-token';
const ADMIN_TOKEN = 'mock-admin-token';
const GITHUB_USER = {
  username: 'e2e-github-user',
  provider: 'github',
  avatar_url: 'https://avatars.example/e2e-github-user.png',
  display_name: 'E2E GitHub User',
};

// 一次性 code → { redirectTo, user }（模拟后端内存单次消费语义）。
const oneTimeCodes = new Map();
let githubEnabled = true;
let codeSequence = 0;

function readBody(request) {
  return new Promise((resolve) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
  });
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function userForToken(token) {
  if (token === GITHUB_TOKEN) return GITHUB_USER;
  if (token === ADMIN_TOKEN) {
    return { username: ADMIN_USERNAME, provider: 'password' };
  }
  return null;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(typeof body === 'string' ? body : envelope(body));
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);

  // --- P1 auth mock（模拟 GitHub OAuth 与密码登录） ---

  if (url.pathname === '/api/__mock/config' && request.method === 'POST') {
    // 测试控制端点：切换 GitHub OAuth 可用性（模拟后端未配置降级）。
    const payload = JSON.parse((await readBody(request)) || '{}');
    if (typeof payload.github_enabled === 'boolean') {
      githubEnabled = payload.github_enabled;
    }
    sendJson(response, 200, { github_enabled: githubEnabled });
    return;
  }

  if (url.pathname === '/api/auth/github/authorize') {
    // 真实后端：未配置 → 400 提示；配置后重定向到 GitHub。
    // mock 直接 302 回站内 /auth/callback（code 单次有效），模拟完整往返。
    if (!githubEnabled) {
      sendJson(
        response,
        400,
        JSON.stringify({ code: 400, error: 'github oauth not configured' }),
      );
      return;
    }
    const redirectTo = url.searchParams.get('redirect_to') || '/';
    const code = `mock-github-code-${++codeSequence}`;
    oneTimeCodes.set(code, { redirectTo, user: GITHUB_USER });
    response.writeHead(302, { location: `/auth/callback?code=${code}` });
    response.end();
    return;
  }

  if (url.pathname === '/api/auth/exchange' && request.method === 'POST') {
    const payload = JSON.parse((await readBody(request)) || '{}');
    const entry = oneTimeCodes.get(payload.code);
    if (!entry) {
      sendJson(
        response,
        401,
        JSON.stringify({ code: 401, error: 'invalid or expired code' }),
      );
      return;
    }
    oneTimeCodes.delete(payload.code);
    sendJson(response, 200, {
      token: GITHUB_TOKEN,
      user: entry.user,
      redirect_to: entry.redirectTo,
    });
    return;
  }

  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    const payload = JSON.parse((await readBody(request)) || '{}');
    if (payload.username === ADMIN_USERNAME && payload.password === ADMIN_PASSWORD) {
      sendJson(response, 200, {
        token: ADMIN_TOKEN,
        user: { username: ADMIN_USERNAME },
      });
    } else {
      sendJson(
        response,
        401,
        JSON.stringify({ code: 401, error: 'Invalid username or password' }),
      );
    }
    return;
  }

  if (url.pathname === '/api/auth/me') {
    const user = userForToken(bearerToken(request));
    if (!user) {
      sendJson(response, 401, JSON.stringify({ code: 401, error: 'not authenticated' }));
      return;
    }
    sendJson(response, 200, user);
    return;
  }

  if (url.pathname === '/api/admin/verify') {
    // 后端注册为 admin.GET("/verify")：authApi.verify 走 GET + Bearer。
    const user = userForToken(bearerToken(request));
    if (!user) {
      sendJson(response, 401, JSON.stringify({ code: 401, error: 'invalid token' }));
      return;
    }
    sendJson(response, 200, { valid: true });
    return;
  }

  if (url.pathname === '/api/admin/logout' && request.method === 'POST') {
    sendJson(response, 200, { message: 'Logout successful' });
    return;
  }

  if (url.pathname === '/api/admin/avatars') {
    // admin 侧边栏页（头像管理）加载用；避免 mock 404 产生未处理 rejection。
    sendJson(response, 200, []);
    return;
  }

  // --- 原有公开接口 ---

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
