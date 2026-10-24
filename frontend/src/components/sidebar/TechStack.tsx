import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { TechStackItem } from '@/api/types';
import PixelChip from '../pixel/ui/PixelChip';

/** 技术栈条目：历史配置可能是纯字符串，也可能是 `{ name }` 对象。 */
export type TechStackEntry = TechStackItem | string;

export interface TechStackProps {
  /** 侧边栏 sidebar 块的 tech_stack 数组；空数组渲染「(未配置)」。 */
  items?: TechStackEntry[];
}

function TechStack({ items = [] }: TechStackProps) {
  const techStackList = items || [];

  return (
    <Box sx={{ mb: 3 }}>
      <SectionTitle>Tech Stack</SectionTitle>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {techStackList.length === 0 && (
          <Box
            component="div"
            sx={{ color: 'text.muted', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}
          >
            (未配置)
          </Box>
        )}
        {techStackList.map((tech) => (
          <PixelChip
            key={typeof tech === 'string' ? tech : tech.name}
            label={typeof tech === 'string' ? tech : tech.name}
            size="small"
          />
        ))}
      </Box>
    </Box>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Box
      component="div"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'text.muted',
        fontSize: '0.75rem',
        mb: 1.5,
        '&::after': {
          content: '""',
          flex: 1,
          height: 1,
          bgcolor: 'border.muted',
          ml: 1,
        }
      }}
    >
      ──[ {children} ]
    </Box>
  );
}

export default TechStack;
