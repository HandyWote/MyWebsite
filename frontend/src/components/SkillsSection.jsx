// SkillsSection组件 - Terminal Aesthetics 风格
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { PixelContainer, PixelCard, PixelChip, PixelTypography, TerminalLine } from './pixel';

const SkillsSection = ({ skills = [] }) => {
  return (
    <PixelContainer section id="skills">
      <TerminalLine>cat skills.json</TerminalLine>

      <PixelCard title="技能清单" accentLine sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {skills.map((skill) => (
            <PixelChip
              key={skill.id || skill.name}
              label={skill.name}
              variant={skill.level > 80 ? 'accent' : 'default'}
            />
          ))}
          {skills.length === 0 && (
            <PixelTypography muted>
              No skills available.
            </PixelTypography>
          )}
        </Box>
      </PixelCard>
    </PixelContainer>
  );
};

export default SkillsSection;
