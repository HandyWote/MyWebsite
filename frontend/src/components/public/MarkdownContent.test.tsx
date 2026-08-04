import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent server rendering', () => {
  it('puts complete GFM and KaTeX article content in initial HTML', () => {
    const content = '# Heading\n\nVisible body.\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] complete\n\n$E = mc^2$';
    const html = renderToStaticMarkup(<MarkdownContent content={content} />);

    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<p>Visible body.</p>');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('class="katex"');
  });

  it('server-renders syntax highlighted ordinary code', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'```javascript\nconst answer = 42;\n```'} />);

    expect(html).toContain('language-javascript');
    expect(html).toContain('<span class="token"');
    expect(html).toContain('>const</span>');
    expect(html).toContain('answer');
  });

  it('keeps Mermaid source and an explanation as a readable server fallback', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'```mermaid\ngraph TD; A-->B\n```'} />);

    expect(html).toContain('data-mermaid-fallback="true"');
    expect(html).toContain('graph TD; A--&gt;B');
    expect(html).toContain('Mermaid diagram source.');
  });

  it('escapes malicious Mermaid source in initial HTML', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'```mermaid\ngraph TD; A[<img src=x onerror=alert(1)>]\n```'} />);

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src="x"');
  });
});
