import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PixelCard from './pixel/ui/PixelCard';
import PixelChip from './pixel/ui/PixelChip';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../config/siteBlocks';

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
      const blockRes = await fetch(getApiUrl.siteBlocks());
      const blockData = await blockRes.json();
      const blocks = unwrapApiPayload(blockData) || [];
      activeConfig = getBlockContent(blocks, 'projects_page');
      setPageConfig(activeConfig);

      const perPage = Number(activeConfig.per_page) || SITE_BLOCK_DEFAULTS.projects_page.per_page;
      const sort = activeConfig.sort || SITE_BLOCK_DEFAULTS.projects_page.sort;
      const username = activeConfig.github_username || SITE_BLOCK_DEFAULTS.projects_page.github_username;
      let page = 1;
      let allRepos = [];

      // GitHub REST API 单页最多 100 条，这里循环拉取直到最后一页
      while (true) {
        const response = await fetch(
          `https://api.github.com/users/${username}/repos?sort=${sort}&per_page=${perPage}&page=${page}`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'HandyWote-Portfolio'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const pageRepos = await response.json();
        allRepos = allRepos.concat(pageRepos);

        if (pageRepos.length < perPage) {
          break;
        }

        page += 1;
      }
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
      <Box sx={{ mb: 3 }}>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'text.secondary' }}
        >
          $ ls -la ./projects/
        </Typography>
        <Typography
          component="div"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: 'accent.green', mb: 2 }}
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
          gap: 2,
        }}
      >
        {projects.map((project, index) => (
          <MotionDiv
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
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
        textDecoration: 'none',
        cursor: project.url ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: project.url ? 'accent.blue' : 'border.muted',
        },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box component="span" sx={{ color: 'accent.blue' }}>
            ▸
          </Box>
          <Typography
            component="h3"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.primary',
              fontWeight: 'bold',
            }}
          >
            {project.name}
          </Typography>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'border.muted', mb: 2 }} />
        <Typography
          component="p"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.secondary',
            fontSize: '0.875rem',
            mb: 2,
          }}
        >
          {project.description}
        </Typography>
      </Box>

      {/* Tags */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {project.tags.map((tag) => (
          <PixelChip key={tag} label={tag} size="small" />
        ))}
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ color: 'accent.yellow' }}>
            ★
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {project.stars}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ color: 'text.muted' }}>
            ⑂
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {project.forks}
          </Typography>
        </Box>
        <Typography
          component="span"
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            color: 'text.muted',
            fontSize: '0.75rem',
            ml: 'auto',
          }}
        >
          updated {project.updatedAt}
        </Typography>
      </Box>
    </PixelCard>
  );
}

export default ProjectList;
