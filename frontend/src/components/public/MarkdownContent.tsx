import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { MermaidDiagram } from './MermaidDiagram';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <Box
      data-testid="article-markdown-content"
      sx={{
        color: 'text.primary',
        lineHeight: 1.8,
        overflowWrap: 'anywhere',
        '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontFamily: 'JetBrains Mono, monospace' },
        '& p, & ul, & ol': { mb: 2 },
        '& pre': { overflow: 'auto', p: 2, border: 1, borderStyle: 'dashed', borderColor: 'divider', bgcolor: 'background.default' },
        '& code': { fontFamily: 'JetBrains Mono, monospace' },
        '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
        '& th, & td': { border: 1, borderColor: 'divider', p: 1 },
        '& img': { maxWidth: '100%', height: 'auto' },
        '& figure': { m: 0, mb: 2 },
        '& figcaption': { mt: 0.75, color: 'text.secondary', fontSize: '0.75rem' },
        '& svg': { display: 'block', maxWidth: '100%', height: 'auto' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const source = String(children);
            const language = /language-([\w-]+)/.exec(className ?? '')?.[1];
            if (language === 'mermaid') return <MermaidDiagram source={source.replace(/\n$/, '')} />;
            if (language) {
              return (
                <SyntaxHighlighter language={language} style={oneDark} PreTag="pre" customStyle={{ margin: 0 }}>
                  {source.replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            if (source.endsWith('\n')) return <pre><code className={className} {...props}>{source}</code></pre>;
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
