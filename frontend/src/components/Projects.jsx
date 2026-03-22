// Projects组件 - Terminal Aesthetics 风格
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState, useEffect } from 'react';
import { PixelContainer, PixelCard, PixelButton, PixelTypography, TerminalLine } from './pixel';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isCacheData, setIsCacheData] = useState(false);
  const [error, setError] = useState(null);

  const isCacheValid = (timestamp) => {
    if (!timestamp) return false;
    const lastUpdateDate = new Date(timestamp).toDateString();
    const today = new Date().toDateString();
    return lastUpdateDate === today;
  };

  const getCachedProjects = () => {
    const cachedData = localStorage.getItem('githubProjects');
    if (!cachedData) return null;
    try {
      const { timestamp, data } = JSON.parse(cachedData);
      if (isCacheValid(timestamp)) {
        setLastUpdated(timestamp);
        setIsCacheData(true);
        return data;
      }
      return null;
    } catch {
      localStorage.removeItem('githubProjects');
      return null;
    }
  };

  const cacheProjects = (data) => {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem('githubProjects', JSON.stringify({ timestamp, data }));
      setLastUpdated(timestamp);
      setIsCacheData(false);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const fetchProjectsFromGitHub = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.github.com/users/HandyWote/repos', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HandyWote-Portfolio'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const sortedProjects = data
        .filter(repo => !repo.fork)
        .sort((a, b) => {
          if (!!a.description !== !!b.description) return !!b.description - !!a.description;
          if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
          return new Date(b.updated_at) - new Date(a.updated_at);
        })
        .map(repo => ({
          title: repo.name,
          description: repo.description || '暂无描述',
          link: repo.html_url,
          stars: repo.stargazers_count
        }));

      setError(null);
      cacheProjects(sortedProjects);
      return sortedProjects;
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      throw error;
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const cachedProjects = getCachedProjects();
      if (cachedProjects) {
        setProjects(cachedProjects);
        return;
      }

      const githubProjects = await fetchProjectsFromGitHub();
      setProjects(githubProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error.message);
      setProjects([
        {
          title: 'handywote.github.io',
          description: '个人网站 - 基于 React + Material-UI',
          link: 'https://github.com/HandyWote/handywote.github.io'
        },
        {
          title: 'MyWebsite',
          description: '全栈个人网站 - React + Flask + PostgreSQL',
          link: 'https://github.com/HandyWote/MyWebsite'
        },
      ]);
      setIsCacheData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const githubProjects = await fetchProjectsFromGitHub();
      setProjects(githubProjects);
    } catch (error) {
      console.error('Error refreshing projects:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <PixelContainer section id="projects">
      <TerminalLine>ls -la ~/projects/</TerminalLine>

      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PixelTypography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          // {projects.length} projects found
        </PixelTypography>
        <Tooltip title="刷新项目数据">
          <IconButton onClick={handleRefresh} size="small" sx={{ color: 'text.secondary' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <PixelTypography sx={{ color: '#f85149', mt: 2, fontSize: '0.75rem' }}>
          // Error: {error}
        </PixelTypography>
      )}

      {lastUpdated && (
        <PixelTypography muted sx={{ mt: 1, fontSize: '0.7rem' }}>
          {isCacheData ? '// using cached data' : '// data updated'} - {formatLastUpdated(lastUpdated)}
        </PixelTypography>
      )}

      <Box sx={{ mt: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {loading ? (
          <PixelTypography muted>Loading...</PixelTypography>
        ) : (
          projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <PixelCard
                title={project.title}
                footer={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {project.stars !== undefined && (
                      <PixelTypography muted sx={{ fontSize: '0.7rem' }}>
                        ★ {project.stars}
                      </PixelTypography>
                    )}
                    <PixelButton
                      variant="ghost"
                      size="small"
                      suffix={<GitHubIcon fontSize="small" />}
                      component="a"
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </PixelButton>
                  </Box>
                }
              >
                <PixelTypography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {project.description}
                </PixelTypography>
              </PixelCard>
            </motion.div>
          ))
        )}
      </Box>
    </PixelContainer>
  );
};

export default Projects;
