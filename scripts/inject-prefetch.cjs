/**
 * Dockerfile 构建时脚本：从 Vite manifest 提取 JS/CSS hash，
 * 注入 prefetch 链接到 3Dend/index.html 的 <!-- PREFETCH_INJECT --> 占位符。
 */
const fs = require('fs');
const manifest = require('/tmp/manifest.json');

const entry = manifest['src/main.jsx'] || {};
const js = '/app/' + (entry.file || '');
const css = entry.css && entry.css[0] ? '/app/' + entry.css[0] : '';

const links = [];
if (js) links.push(`<link rel="prefetch" href="${js}">`);
if (css) links.push(`<link rel="prefetch" href="${css}">`);

let html = fs.readFileSync('/tmp/index.html.bak', 'utf8');
if (html.includes('<!-- PREFETCH_INJECT -->')) {
  html = html.replace('<!-- PREFETCH_INJECT -->', links.join('\n  '));
  fs.writeFileSync('/tmp/index.html.bak', html);
  console.log('Prefetch injected:', links.join(' '));
} else {
  console.warn('Warning: <!-- PREFETCH_INJECT --> placeholder not found in index.html');
}
