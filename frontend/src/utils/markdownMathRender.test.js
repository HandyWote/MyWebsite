import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeDisplayMath } from './markdownMath.js';

const markdown = '$$∀x(A(x)∧B(x)) ⇔ ∀xA(x)∧∀xB(x)$$';
const fencedCodeSample = ['```tex', '$$E=mc^2$$', '```'].join('\n');
const indentedCodeSample = ['    $$E=mc^2$$', '    nextLine'].join('\n');

const rawHtml = renderToStaticMarkup(
  React.createElement(
    ReactMarkdown,
    { remarkPlugins: [remarkMath, remarkGfm], rehypePlugins: [rehypeKatex] },
    markdown
  )
);

assert.equal(
  rawHtml.includes('katex-display'),
  false,
  '当前渲染链路会把单行 $$...$$ 识别为行内公式'
);

const normalizedHtml = renderToStaticMarkup(
  React.createElement(
    ReactMarkdown,
    { remarkPlugins: [remarkMath, remarkGfm], rehypePlugins: [rehypeKatex] },
    normalizeDisplayMath(markdown)
  )
);

assert.equal(
  normalizedHtml.includes('katex-display'),
  true,
  '预处理后单行 $$...$$ 应按块级公式渲染（katex-display）'
);

assert.equal(
  normalizeDisplayMath(fencedCodeSample),
  fencedCodeSample,
  'fenced code block 内的 $$...$$ 不应被改写'
);

assert.equal(
  normalizeDisplayMath(indentedCodeSample),
  indentedCodeSample,
  '缩进代码块内的 $$...$$ 不应被改写'
);

console.log('markdownMathRender.test passed');
