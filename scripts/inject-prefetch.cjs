/**
 * Dockerfile 构建时脚本：从 Vite manifest 提取 JS/CSS hash，
 * 注入 Speculation Rules 到 3Dend/index.html 的 <!-- PREFETCH_INJECT --> 占位符。
 *
 * 使用 <script type="speculationrules"> 而非 <link rel="prefetch">，
 * 因为 Cloudflare 原生支持 Speculation Rules 格式，不会返回 503 拦截。
 */
const fs = require('fs');
const manifest = require('/tmp/manifest.json');

const entry = manifest['src/main.jsx'] || {};
const js = '/app/' + (entry.file || '');
const css = entry.css && entry.css[0] ? '/app/' + entry.css[0] : '';

const urls = [js, css].filter(Boolean);

let html = fs.readFileSync('/tmp/index.html.bak', 'utf8');
if (html.includes('<!-- PREFETCH_INJECT -->')) {
  const rules = JSON.stringify({ prefetch: [{ source: 'list', urls }] }, null, 2);
  const tag = `<script type="speculationrules">\n${rules}\n</script>`;
  html = html.replace('<!-- PREFETCH_INJECT -->', tag);
  fs.writeFileSync('/tmp/index.html.bak', html);
  console.log('Speculation Rules injected:', urls.join(' '));
} else {
  console.warn('Warning: <!-- PREFETCH_INJECT --> placeholder not found in index.html');
}
