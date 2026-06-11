import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { navButtonSx } from './utils';

function ArticleDetailNav({ articles = [], loading = false }) {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography
        component="div"
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          color: 'text.muted',
          fontSize: '0.75rem',
          mb: 1.25,
        }}
      >
        articles
      </Typography>

      {loading ? (
        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.muted', fontSize: '0.75rem' }}>
          loading...
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {articles.map((article) => {
            const active = String(article.id) === String(id);
            return (
              <Box
                component="button"
                type="button"
                key={article.id}
                onClick={() => navigate(`/articles/${article.id}`)}
                data-active={active ? 'true' : 'false'}
                sx={navButtonSx(active, { fontSize: '0.75rem' })}
              >
                <Box component="span" sx={{ color: active ? 'accent.blue' : 'text.muted' }}>
                  {active ? '▸' : ''}
                </Box>
                <Box
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {article.title}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default ArticleDetailNav;
