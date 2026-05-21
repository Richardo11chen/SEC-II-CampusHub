import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface Props {
  children: ReactNode;
  /** 子元素间的延迟间隔 (ms) */
  stagger?: number;
}

/**
 * 包裹页面内容，提供 fadeInUp 入场动画。
 * 子元素若是数组，每个元素增加 stagger 延迟。
 */
export default function PageTransition({ children, stagger = 60 }: Props) {
  return (
    <Box
      sx={{
        animation: 'ptFadeInUp 0.4s ease both',
        '@keyframes ptFadeInUp': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '& > *': {
          animation: `ptFadeInUp 0.4s ease both`,
          animationDelay: `${stagger}ms`,
        },
      }}
    >
      {children}
    </Box>
  );
}
