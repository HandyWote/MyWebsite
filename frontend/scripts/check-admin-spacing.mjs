import { chromium } from '@playwright/test';

const baseURL = (process.env.ADMIN_SPACING_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const envelope = (data) => JSON.stringify({ code: 0, data });

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

async function installAdminMocks(page) {
  await page.route('**/api/admin/verify', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: envelope({ valid: true }),
  }));

  await page.route('**/api/admin/site-blocks**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: envelope([
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
          social_links: [{ label: 'GitHub', href: 'https://github.com/HandyWote' }],
          education: [{ school: '学校名称', period: '2020-2024', desc: '描述' }],
          tech_stack: [{ name: 'React', level: 'advanced' }],
        },
      },
    ]),
  }));

  await page.route('**/api/admin/avatars**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: envelope([]),
  }));

  await page.route('**/api/admin/comments**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: envelope({
      comments: [
        {
          id: 1,
          author: '评论者',
          email: 'user@example.com',
          content: '这是一条比较长的评论内容，用来观察评论卡片在 admin 页面里的文字折行和行间距是否会拥挤。',
          status: 'pending',
          ip_address: '127.0.0.1',
          article_title: '测试文章标题很长很长用于观察挤压',
          user_agent: 'Chrome',
          created_at: '2026-08-08T10:30:00Z',
          updated_at: '2026-08-08T10:30:00Z',
        },
      ],
      total: 1,
      page: 1,
    }),
  }));

  await page.route('**/api/admin/articles**', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: envelope({ articles: [], items: [], total: 0, page: 1 }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ id: 1 }),
    });
  });
}

async function gotoAdmin(page, path) {
  await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function collectFields(page, selector = '.MuiTextField-root') {
  return page.evaluate((fieldSelector) => [...document.querySelectorAll(fieldSelector)].map((el) => {
    const rect = el.getBoundingClientRect();
    const input = el.querySelector('input, textarea');
    const inputStyle = input ? getComputedStyle(input) : null;
    const helper = el.querySelector('.MuiFormHelperText-root')?.getBoundingClientRect();
    return {
      label: el.querySelector('label')?.textContent || input?.getAttribute('placeholder') || '',
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      height: Math.round(rect.height),
      paddingTop: inputStyle?.paddingTop || null,
      paddingBottom: inputStyle?.paddingBottom || null,
      helperHeight: helper ? Math.round(helper.height) : 0,
    };
  }), selector);
}

function verticalGaps(fields) {
  const sorted = [...fields].sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const uniqueRows = [];
  for (const field of sorted) {
    if (!uniqueRows.some(row => Math.abs(row.top - field.top) < 4)) uniqueRows.push(field);
  }
  return uniqueRows.slice(0, -1).map((field, index) => ({
    from: field.label,
    to: uniqueRows[index + 1].label,
    gap: uniqueRows[index + 1].top - field.bottom,
  }));
}

async function checkSidebar(page) {
  await gotoAdmin(page, '/admin/sidebar');
  const fields = await collectFields(page);
  const gaps = verticalGaps(fields).filter(item => item.gap < 80);

  assert(fields.slice(0, 3).every(field => field.height >= 48), 'Sidebar TextField height is compressed', fields.slice(0, 3));
  assert(gaps.every(item => item.gap >= 16), 'Sidebar vertical field gap is too tight', gaps);
}

async function checkComments(page) {
  await gotoAdmin(page, '/admin/comments');
  const controls = await collectFields(page, '.MuiTextField-root, .MuiFormControl-root');
  assert(controls.slice(0, 2).every(control => control.height >= 48), 'Comments filter controls are compressed', controls.slice(0, 2));
}

async function checkArticleDialog(page) {
  await gotoAdmin(page, '/admin/articles');
  await page.getByRole('button', { name: /新建文章/ }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('标签（逗号分隔）').fill('@');
  await page.waitForTimeout(100);

  const fields = await collectFields(page, '.MuiDialog-root .MuiTextField-root');
  const tags = fields.find(field => field.label.includes('标签'));
  const summary = fields.find(field => field.label === '摘要');

  assert(tags?.height >= 76 && tags.helperHeight >= 16, 'Article tags helper text did not reserve space', tags);
  assert(summary && tags && summary.top - tags.bottom >= 16, 'Article tags helper text overlaps the next field', { tags, summary, gap: summary?.top - tags?.bottom });
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await installAdminMocks(page);
  await page.addInitScript(() => window.localStorage.setItem('token', 'admin-spacing-token'));

  try {
    await checkSidebar(page);
    await checkComments(page);
    await checkArticleDialog(page);
    process.stdout.write('Admin spacing checks passed\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
