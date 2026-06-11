import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getApiUrl, unwrapApiPayload } from '../../config/api';
import { uniqueCommands, navButtonSx } from './utils';
import ArticleDetailNav from './ArticleDetailNav';
import TerminalCommandBar from './TerminalCommandBar';

const EXPLORER_ITEMS = [
  { label: 'articles', path: '/articles' },
  { label: 'projects', path: '/projects' },
  { label: 'about', path: '/' },
];

const getShellState = (pathname) => {
  if (/^\/articles\/[^/]+/.test(pathname)) {
    return {
      cwd: '~/app/articles',
      suggestions: ['open prev', 'open next', 'exit', 'cd projects/', 'help'],
      detail: true,
    };
  }

  if (pathname.startsWith('/projects')) {
    return {
      cwd: '~/app/projects',
      suggestions: ['cd articles/', 'cd about/', 'help'],
      detail: false,
    };
  }

  return {
    cwd: '~/app/articles',
    suggestions: ['open latest', 'cd projects/', 'cd about/', 'help'],
    detail: false,
  };
};

const toCommandSlug = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');


function TerminalShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const shell = getShellState(location.pathname);
  const [articleCommands, setArticleCommands] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const inArticles = location.pathname.startsWith('/articles');

  useEffect(() => {
    if (!inArticles) {
      setArticleCommands([]);
      return undefined;
    }

    let ignore = false;

    const fetchArticleCommands = async () => {
      try {
        setArticlesLoading(true);
        const response = await fetch(`${getApiUrl.articles()}?page=1&per_page=100`);
        const data = await response.json();
        const payload = unwrapApiPayload(data);
        const articles = payload?.items || payload?.articles || [];
        if (!ignore) {
          setArticleCommands(articles);
        }
      } catch {
        if (!ignore) {
          setArticleCommands([]);
        }
      } finally {
        if (!ignore) {
          setArticlesLoading(false);
        }
      }
    };

    fetchArticleCommands();
    return () => {
      ignore = true;
    };
  }, [inArticles]);

  const articleOpenCommands = inArticles
    ? articleCommands.map((article) => `open ${article.title}`)
    : [];
  const shellCommands = uniqueCommands([...shell.suggestions, ...articleOpenCommands]);

  const handleCommand = (command) => {
    if ((command === 'exit' || command === 'back') && shell.detail) {
      navigate('/articles');
      return true;
    }

    if ((command === 'open prev' || command === 'open next') && shell.detail) {
      const currentIndex = articleCommands.findIndex((article) => String(article.id) === String(id));
      if (currentIndex === -1) {
        return true;
      }

      const nextIndex = command === 'open prev' ? currentIndex - 1 : currentIndex + 1;
      const nextArticle = articleCommands[nextIndex];
      if (nextArticle) {
        navigate(`/articles/${nextArticle.id}`);
      }
      return true;
    }

    if (command === 'open latest' && inArticles) {
      const latestArticle = articleCommands[0];
      if (latestArticle) {
        navigate(`/articles/${latestArticle.id}`);
      }
      return true;
    }

    if (inArticles && command.startsWith('open ') && command !== 'open prev' && command !== 'open next') {
      const target = command.replace(/^open\s+/, '').trim();
      if (/^\d+$/.test(target)) {
        navigate(`/articles/${target}`);
        return true;
      }
      const matchedArticle = articleCommands.find((article) => (
        article.title === target ||
        toCommandSlug(article.title) === toCommandSlug(target)
      ));
      if (matchedArticle) {
        navigate(`/articles/${matchedArticle.id}`);
        return true;
      }
    }

    return false;
  };

  return (
    <Box
      sx={{
        height: { xs: 'calc(100dvh - 20px)', sm: 'calc(100vh - 24px)' },
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'border.default',
        bgcolor: 'bg.primary',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: shell.detail ? '240px minmax(0, 1fr)' : '180px minmax(0, 1fr)',
          },
          minHeight: 0,
        }}
      >
        <Box
          component="aside"
          sx={{
            display: { xs: 'none', md: 'block' },
            minHeight: 0,
            overflow: 'auto',
            borderRight: 1,
            borderColor: 'border.default',
            bgcolor: 'bg.secondary',
          }}
        >
          {shell.detail ? (
            <ArticleDetailNav articles={articleCommands} loading={articlesLoading} />
          ) : (
            <ExplorerPane activePath={location.pathname} />
          )}
        </Box>

        <Box component="main" sx={{ minWidth: 0, minHeight: 0, overflow: 'auto' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 34,
              px: 1.5,
              borderBottom: 1,
              borderColor: 'border.default',
              bgcolor: 'bg.secondary',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.75rem',
              gap: 1,
            }}
          >
            <Box
              component="span"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shell.cwd}/
            </Box>
            <Box component="span">NORMAL</Box>
          </Box>
          <Box sx={{ p: { xs: 1, sm: 2.5 }, minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      <TerminalCommandBar
        cwd={shell.cwd}
        commands={shellCommands}
        onCommand={handleCommand}
      />
    </Box>
  );
}

function ExplorerPane({ activePath }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 1.5 }}>
      <Box
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          color: 'text.muted',
          fontSize: '0.75rem',
          mb: 1.25,
        }}
      >
        explorer
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {EXPLORER_ITEMS.map((item) => {
          const active = item.path !== '/' && activePath.startsWith(item.path);
          return (
            <Box
              component="button"
              type="button"
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={navButtonSx(active)}
            >
              <Box component="span" sx={{ color: active ? 'accent.blue' : 'text.muted' }}>
                {active ? '▸' : ''}
              </Box>
              <Box component="span">{item.label}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default TerminalShellLayout;
