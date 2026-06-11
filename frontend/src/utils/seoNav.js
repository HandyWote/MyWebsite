// src/utils/seoNav.js
// SEO 路径下的导航工具：检测 iframe 外直接访问，自动调整导航路径

const isDirectAccess = typeof window !== 'undefined' && window.self === window.top;

/**
 * 调整导航路径：在 SEO 直接访问模式下，非文章链接自动加 /app 前缀
 *
 * 行为：
 * - 文章间互点 → /articles/:id（Go SEO handler，带 SEO 标签）
 * - 点击"文章列表"、"项目"等 → /app/articles、/app/projects（进入 /app/ SPA）
 * - 点击"返回主页" → /（3D 场景）
 */
export function getNavPath(path) {
  if (isDirectAccess && !path.startsWith('/articles/') && path !== '/') {
    return '/app' + path;
  }
  return path;
}

export { isDirectAccess };
