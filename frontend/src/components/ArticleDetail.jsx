import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Typography,
  Box,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import 'katex/dist/katex.min.css';
import { getApiUrl, unwrapApiPayload } from '../config/api';
import { PixelCard, PixelButton, PixelChip, PixelTypography, TerminalLine } from './pixel';
import PdfViewerOnCanvas from './PdfViewerOnCanvas';
import ArticleMarkdownContent from './articles/ArticleMarkdownContent';
import CommentSection from './articles/CommentSection';
import { ARTICLE_CONTENT_SX } from './articles/articleContentTheme';
import { formatDate } from '../utils/formatDate';
import { normalizeTags } from '../utils/normalizeTags';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import useArticleSeo from '../hooks/useArticleSeo';
import useNotification from '../hooks/useNotification';
import NotificationSnackbar from './NotificationSnackbar';

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showNotification,
    hideNotification,
  } = useNotification();

  // SEO meta 管理
  const coverUrl = article ? resolveAssetUrl(article.cover) : '';
  useArticleSeo(article, coverUrl);

  // 获取文章详情
  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl.articleDetail(id));

      if (response.ok) {
        const data = await response.json();
        const rawArticle = unwrapApiPayload(data);
        const processedArticle = rawArticle ? {
          ...rawArticle,
          tags: normalizeTags(rawArticle.tags),
        } : null;
        setArticle(processedArticle);
        setDemoMode(false);
      } else {
        throw new Error('API 请求失败');
      }
    } catch {
      console.error('获取文章失败');
      setError('文章不存在或已被删除');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // 分享文章
  const handleShare = () => {
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showNotification('链接已复制到剪贴板', 'success');
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <TerminalLine>cat article/{id}.md</TerminalLine>
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'border.default',
            p: 3,
            borderRadius: 0,
          }}
        >
          <Skeleton variant="text" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" height={40} sx={{ mb: 4 }} />
          <Skeleton variant="rectangular" height={300} sx={{ mb: 4 }} />
          <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <TerminalLine>cat article/{id}.md</TerminalLine>
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'border.default',
            p: 3,
            borderRadius: 0,
          }}
        >
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
          <PixelButton variant="ghost" startIcon={<ArrowBack />} onClick={() => window.history.back()}>
            返回
          </PixelButton>
        </Box>
      </Box>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <Box sx={{ p: 3 }}>
      <TerminalLine>cat article/{id}.md</TerminalLine>

      {/* 边框容器 - 与列表页一致 */}
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'border.default',
          p: 3,
          borderRadius: 0,
        }}
      >
        {/* 返回按钮 */}
        <PixelButton variant="ghost" startIcon={<ArrowBack />} component={Link} to="/articles">
          返回文章列表
        </PixelButton>

        {/* 演示模式提示 */}
        {demoMode && (
          <Alert severity="info" sx={{ mb: 0, mt: 2 }}>
            当前处于演示模式，显示的是示例文章内容。评论功能在演示模式下不可用。
          </Alert>
        )}

        <PixelCard sx={{ mt: 2 }}>
            {/* 文章头部信息 */}
            <Box sx={{ mb: 4 }}>
              <PixelTypography variant="h1" className="cursor-blink" sx={{ mb: 2 }}>
                {article.title}
              </PixelTypography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {article.category && <PixelChip label={article.category} color="primary" />}
                {article.tags && article.tags.map((tag, index) => (
                  <PixelChip key={index} label={tag} variant="outline" />
                ))}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(article.created_at, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>

                {article.views && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {article.views} 次阅读
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={handleShare} role="button" tabIndex={0} aria-label="分享文章">
                  <ShareIcon fontSize="small" sx={{ cursor: 'pointer' }} />
                </Box>
              </Box>

              {article.summary && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {article.summary}
                </Typography>
              )}
            </Box>

            {/* 文章内容 */}
            <Box sx={ARTICLE_CONTENT_SX}>
              {article.content_type === 'pdf' ? (
                <PdfViewerOnCanvas filename={article.pdf_filename} />
              ) : (
                <ArticleMarkdownContent content={article.content} />
              )}
            </Box>
          </PixelCard>

          {/* 评论区 — 独立组件 */}
          <Box sx={{ mt: 3 }}>
            <CommentSection articleId={article.id} demoMode={demoMode} />
          </Box>
      </Box>

      <NotificationSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={hideNotification}
      />
    </Box>
  );
};

export default ArticleDetail;
