/**
 * 文章 Markdown 内容区域的排版样式。
 * 提取为常量避免每次渲染重新创建，可被 ArticleMarkdownContent 等组件复用。
 */
export const ARTICLE_CONTENT_SX = {
  minHeight: { xs: '300px', sm: '400px', md: '500px' },
  height: { xs: 'auto', sm: '100%' },
  overflow: 'auto',
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 4,
    mb: 2,
    fontWeight: 'bold'
  },
  '& p': {
    mb: 2,
    lineHeight: 1.8
  },
  '& ul, & ol': {
    mb: 2,
    pl: 3
  },
  '& li': {
    mb: 1
  },
  '& blockquote': {
    borderLeft: '4px solid #2196F3',
    pl: 2,
    ml: 0,
    fontStyle: 'italic',
    color: 'text.secondary'
  },
  '& code': {
    backgroundColor: 'rgba(88, 166, 255, 0.15)',
    color: '#58a6ff',
    px: 1,
    py: 0.5,
    borderRadius: 0,
    fontSize: '0.9em',
    fontFamily: "'JetBrains Mono', monospace",
  },
  '& pre': {
    mb: 3
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: 1,
    my: 2
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    mb: 3
  },
  '& th, & td': {
    border: '1px solid #30363d',
    p: 1,
    textAlign: 'left'
  },
  '& th': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e5e5'
  }
};
