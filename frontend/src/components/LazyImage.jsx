import { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 实现图片懒加载
 * 支持加载状态、错误处理和过渡动画
 */
const LazyImage = ({ src, alt, fallbackSrc, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageError = () => {
    setHasError(true);
    if (fallbackSrc) {
      // 如果有备用图片，尝试加载备用图片
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setIsLoaded(true);
      };
      fallbackImg.src = fallbackSrc;
    }
  };

  const imageSrc = hasError && fallbackSrc ? fallbackSrc : (isLoaded ? src : undefined);

  return (
    <Box
      ref={imgRef}
      component="img"
      src={imageSrc}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      onError={handleImageError}
      sx={{
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
        ...props.sx
      }}
      {...props}
    />
  );
};

export default LazyImage;
