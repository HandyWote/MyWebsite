import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

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
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const language = /language-(\w+)/.exec(className ?? '')?.[1];
            if (language === 'mermaid') {
              return <code className={className} data-mermaid-fallback="true" {...props}>{children}</code>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
