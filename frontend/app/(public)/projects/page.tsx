import { connection } from 'next/server';
import { ExternalLink } from 'lucide-react';
import { Box, Card, Chip, Typography } from '@mui/material';
import { getProjects } from '@/api/publicApi.server';
import { PublicShell } from '@/components/public/PublicShell';

export default async function ProjectsPage() {
  await connection();
  const { config, projects, error } = await getProjects();
  return (
    <PublicShell activePath="/projects">
      <Typography sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>$ ls -la ./projects/</Typography>
      <Typography sx={{ color: error ? 'error.main' : 'success.main', fontFamily: 'JetBrains Mono, monospace', mb: 1.5 }}>{error ? `error: ${error}` : `found ${projects.length} repositories`}</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }} />
      {!error && projects.length === 0 && <Typography color="text.secondary">{String(config.empty_text)}</Typography>}
      <Box sx={{ display: 'grid', gap: 1 }}>
        {projects.map((project) => (
          <Card key={project.id} component="a" href={project.url} target="_blank" rel="noreferrer" sx={{ display: 'block', p: 2, color: 'inherit', textDecoration: 'none', '&:hover': { borderColor: 'primary.main' } }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Typography component="h2" sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{project.name}</Typography><ExternalLink size={14} /></Box>
            <Typography color="text.secondary" sx={{ my: 1 }}>{project.description}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>{project.tags.map((tag) => <Chip key={tag} label={tag} size="small" />)}<Typography component="time" sx={{ ml: { sm: 'auto' }, color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>★ {project.stars} · ⑂ {project.forks} · updated {project.updatedAt}</Typography></Box>
          </Card>
        ))}
      </Box>
    </PublicShell>
  );
}
