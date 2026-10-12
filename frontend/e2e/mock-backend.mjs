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

// --- P1 drawing 画板 mock 状态 ---

// 公共画布固定快照（坐标 0-1,与前端 Stroke 契约一致）。
const canvasStrokes = [
  {
    id: 'mock-stroke-1',
    color: '#264653',
    width: 0.02,
    points: [
      { x: 0.2, y: 0.3, t: 1 },
      { x: 0.5, y: 0.4, t: 2 },
      { x: 0.8, y: 0.3, t: 3 },
    ],
  },
  {
    id: 'mock-stroke-2',
    color: '#c1121f',
    width: 0.015,
    points: [
      { x: 0.25, y: 0.6, t: 4 },
      { x: 0.55, y: 0.7, t: 5 },
    ],
  },
];
let canvasVersion = 3;
let canvasUpdatedAt = '2026-08-05T00:00:00Z';

// POST canvas 行为开关（默认机审通过直接发布）。
let drawingSubmitMode = 'published';

// 固定待审提交（admin 列表用,strokes 为 JSON 字符串,同 T5 契约）。
const pendingSubmissions = [
  {
    id: 1,
    base_version: 3,
    strokes: JSON.stringify([canvasStrokes[0]]),
    status: 'pending',
    reason: null,
    created_by: 'e2e-github-user',
    created_at: '2026-08-05T01:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
  },
];

function rawJson(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
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
    if (
      ['published', 'conflict', 'rejected_graphic', 'rejected_ocr', 'pending', 'ratelimited'].includes(
        payload.drawing_submit_mode,
      )
    ) {
      drawingSubmitMode = payload.drawing_submit_mode;
    }
    sendJson(response, 200, { github_enabled: githubEnabled, drawing_submit_mode: drawingSubmitMode });
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

  // --- P1 drawing 画板契约（工单 #9 T5 冻结契约的 mock） ---

  if (url.pathname === '/api/games/drawing/canvas' && request.method === 'GET') {
    sendJson(response, 200, {
      version: canvasVersion,
      strokes: canvasStrokes,
      updated_at: canvasUpdatedAt,
    });
    return;
  }

  if (url.pathname === '/api/games/drawing/canvas' && request.method === 'POST') {
    // 匿名提交：后端统一 401 裁决（前端出登录引导 toast，不发后续请求）。
    if (!bearerToken(request)) {
      rawJson(response, 401, { error: '请先登录后再提交' });
      return;
    }
    switch (drawingSubmitMode) {
      case 'conflict':
        rawJson(response, 409, { error: 'version conflict', current_version: 4 });
        return;
      case 'rejected_graphic':
        rawJson(response, 422, { error: 'rejected', reason: 'graphic' });
        return;
      case 'rejected_ocr':
        rawJson(response, 422, { error: 'rejected', reason: 'ocr' });
        return;
      case 'pending':
        // 提交进入人工审核队列（机审不确定）。
        sendJson(response, 202, { status: 'pending', submission_id: 1 });
        return;
      case 'ratelimited':
        rawJson(response, 429, { error: '提交过于频繁,请稍后再试' });
        return;
      default:
        // published：机审通过直接发布，画布版本推进。
        canvasVersion += 1;
        canvasUpdatedAt = new Date().toISOString();
        sendJson(response, 200, { version: canvasVersion, status: 'published' });
        return;
    }
  }

  if (url.pathname === '/api/admin/drawing/submissions' && request.method === 'GET') {
    if (bearerToken(request) !== ADMIN_TOKEN) {
      sendJson(response, 401, JSON.stringify({ code: 401, error: 'invalid token' }));
      return;
    }
    sendJson(response, 200, { submissions: pendingSubmissions, total: pendingSubmissions.length });
    return;
  }

  const approveMatch = url.pathname.match(/^\/api\/admin\/drawing\/submissions\/(\d+)\/approve$/);
  if (approveMatch && request.method === 'POST') {
    if (bearerToken(request) !== ADMIN_TOKEN) {
      sendJson(response, 401, JSON.stringify({ code: 401, error: 'invalid token' }));
      return;
    }
    sendJson(response, 200, { id: Number(approveMatch[1]), status: 'approved' });
    return;
  }

  const rejectMatch = url.pathname.match(/^\/api\/admin\/drawing\/submissions\/(\d+)\/reject$/);
  if (rejectMatch && request.method === 'POST') {
    if (bearerToken(request) !== ADMIN_TOKEN) {
      sendJson(response, 401, JSON.stringify({ code: 401, error: 'invalid token' }));
      return;
    }
    sendJson(response, 200, { id: Number(rejectMatch[1]), status: 'rejected' });
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
