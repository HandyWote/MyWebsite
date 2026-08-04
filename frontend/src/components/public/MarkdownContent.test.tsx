import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

describe('MarkdownContent server rendering', () => {
  it('puts article headings and paragraphs in initial HTML', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'# Heading\n\nVisible body.'} />);
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<p>Visible body.</p>');
  });

  it('keeps Mermaid source as readable server fallback', () => {
    const html = renderToStaticMarkup(<MarkdownContent content={'```mermaid\ngraph TD; A-->B\n```'} />);
    expect(html).toContain('data-mermaid-fallback="true"');
    expect(html).toContain('graph TD; A--&gt;B');
  });
});
