import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';

const MermaidComponent = ({ code }) => {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        setLoading(true);
        setError(null);

        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: "'JetBrains Mono', monospace",
          themeVariables: {
            primaryColor: '#58a6ff',
            primaryTextColor: '#f0f6fc',
            primaryBorderColor: '#30363d',
            lineColor: '#8b949e',
            secondaryColor: '#21262d',
            tertiaryColor: '#161b22',
          },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('图表渲染失败');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      renderMermaid();
    }
  }, [code]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          border: '1px dashed #30363d',
          bgcolor: '#161b22',
          my: 2,
        }}
      >
        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#8b949e' }}>
          渲染中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px',
          border: '1px solid #f85149',
          bgcolor: 'rgba(248, 81, 73, 0.1)',
          my: 2,
        }}
      >
        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#f85149' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        my: 3,
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
        },
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  if (language === 'mermaid') {
    return <MermaidComponent code={code} />;
  }

  return !inline && match ? (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      customStyle={{
        borderRadius: 0,
        padding: '16px',
        margin: '16px 0',
        border: '1px dashed #30363d',
      }}
      {...props}
    >
      {code}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

const ArticleMarkdownContent = ({ content = '' }) => {
  return (
    <Box data-testid="article-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default ArticleMarkdownContent;
