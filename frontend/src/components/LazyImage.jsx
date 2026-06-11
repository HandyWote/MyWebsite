import { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 实现图片懒加载
 * 支持 srcset/sizes（响应式图片）、加载状态、错误处理和过渡动画
 *
 * CLS 防护：建议通过 sx 传入固定宽高或 aspect-ratio
 *
 * @example
 * // 响应式图片
 * <LazyImage
 *   src="/uploads/cover.webp"
 *   alt="文章封面"
 *   srcSet="/uploads/cover-400w.webp 400w, /uploads/cover-800w.webp 800w"
 *   sizes="(max-width: 600px) 100vw, 50vw"
 *   sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
 * />
 */
const LazyImage = ({ src, alt, fallbackSrc, srcSet, sizes, ...props }) => {
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

  const handleImageError = (event) => {
    setHasError(true);
    if (typeof props.onError === 'function') {
      props.onError(event);
    }
    if (fallbackSrc) {
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
      srcSet={isLoaded ? srcSet : undefined}
      sizes={sizes}
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
