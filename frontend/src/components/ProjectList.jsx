import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import PixelChip from './pixel/ui/PixelChip';
import { api, API_ENDPOINTS } from '../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';
import { fetchGithubRepos, buildGithubCacheKey, readGithubCache } from '../utils/github';

const MotionDiv = motion.div;

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [pageConfig, setPageConfig] = useState(SITE_BLOCK_DEFAULTS.projects_page);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    let activeConfig = SITE_BLOCK_DEFAULTS.projects_page;
    try {
      const blocks = (await api.get(API_ENDPOINTS.PUBLIC.SITE_BLOCKS)) || [];
      activeConfig = getBlockContent(blocks, 'projects_page');
      setPageConfig(activeConfig);

      const perPage = Number(activeConfig.per_page) || SITE_BLOCK_DEFAULTS.projects_page.per_page;
      const sort = activeConfig.sort || SITE_BLOCK_DEFAULTS.projects_page.sort;
      const username = activeConfig.github_username || SITE_BLOCK_DEFAULTS.projects_page.github_username;

      const allRepos = await fetchGithubRepos(username, { sort, perPage });
      const mappedProjects = allRepos
        .map(repo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description || '暂无描述',
          tags: repo.topics?.slice(0, 3) || (repo.language ? [repo.language] : []),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: formatRelativeTime(repo.updated_at),
          url: repo.html_url,
        }))
        .sort((a, b) => b.stars - a.stars);

      setProjects(mappedProjects);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      const perPage = Number(activeConfig.per_page) || SITE_BLOCK_DEFAULTS.projects_page.per_page;
      const sort = activeConfig.sort || SITE_BLOCK_DEFAULTS.projects_page.sort;
      const username = activeConfig.github_username || SITE_BLOCK_DEFAULTS.projects_page.github_username;
      const cacheKey = buildGithubCacheKey(username, sort, perPage);
      const staleCache = readGithubCache(cacheKey);

      if (staleCache && Array.isArray(staleCache.data) && staleCache.data.length > 0) {
        setProjects(staleCache.data);
        setError(null);
        return;
      }

      setError(activeConfig.error_text || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);
  return (
    <Box>
      {/* Terminal header */}
      <Box sx={{ mb: 1.5 }}>
        <Typography
          component="div"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.secondary',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          $ ls -la ./projects/
        </Typography>
        <Typography
          component="div"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#3fb950',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            mb: 1,
          }}
        >
          {loading ? 'fetching repositories...' : `found ${projects.length} repositories`}
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted' }} />
      </Box>

      {/* Error message */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'accent.red', fontSize: '0.875rem' }}
          >
            error: {error}
          </Typography>
        </Box>
      )}

      {!loading && !error && projects.length === 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography
            component="div"
            sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {pageConfig.empty_text || SITE_BLOCK_DEFAULTS.projects_page.empty_text}
          </Typography>
        </Box>
      )}

      {/* Project grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 0.75,
        }}
      >
        {projects.map((project, index) => (
          <MotionDiv
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.025, 0.35) }}
          >
            <ProjectCard project={project} />
          </MotionDiv>
        ))}
      </Box>
    </Box>
  );
}

function ProjectCard({ project }) {
  return (
    <PixelCard
      component="a"
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        cursor: project.url ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: project.url ? 'accent.blue' : 'border.muted',
          color: 'inherit',
          textDecoration: 'none',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          minWidth: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            component="h3"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.125rem' },
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {project.name}
          </Typography>
          <ExternalLink size={14} aria-hidden="true" />
        </Box>

        <Typography
          component="p"
          sx={{
            color: 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {project.description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {project.tags.map((tag) => (
            <PixelChip key={tag} label={tag} size="small" />
          ))}

          <Typography
            component="span"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.muted',
              fontSize: '0.7rem',
              ml: { xs: 0, sm: 'auto' },
              width: { xs: '100%', sm: 'auto' },
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
            }}
          >
            ★ {project.stars} · ⑂ {project.forks} · updated {project.updatedAt}
          </Typography>
        </Box>
      </Box>
    </PixelCard>
  );
}

export default ProjectList;
