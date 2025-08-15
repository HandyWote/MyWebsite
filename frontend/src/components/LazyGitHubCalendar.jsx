import { useState, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import LazyImage from './LazyImage';

/**
 * 懒加载GitHub日历组件
 * 延迟加载GitHub贡献日历，优化性能
 * 包含加载状态和错误处理
 */
const LazyGitHubCalendar = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const calendarRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 延迟加载，确保用户真的需要看到
          const timer = setTimeout(() => {
            setIsLoaded(true);
            observer.disconnect();
          }, 1000);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );

    if (calendarRef.current) {
      observer.observe(calendarRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <Box ref={calendarRef}>
      {!isLoaded && (
        <Box sx={{ 
          height: '200px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            正在加载GitHub贡献日历...
          </Typography>
        </Box>
      )}
      {isLoaded && (
        <LazyImage
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          sx={{
            filter: 'opacity(0.9)',
            transition: 'filter 0.3s ease',
            '&:hover': {
              filter: 'opacity(1)'
            },
            ...props.sx
          }}
          {...props}
        />
      )}
    </Box>
  );
};

export default LazyGitHubCalendar;
