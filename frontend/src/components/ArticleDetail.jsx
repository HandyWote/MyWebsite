import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Avatar,
  Divider,
  IconButton,
  Alert,
  Skeleton,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  Send as SendIcon
} from '@mui/icons-material';
import 'katex/dist/katex.min.css';
import { getApiUrl, getApiMessage, unwrapApiPayload } from '../config/api'; // 导入API配置
import { PixelContainer, PixelCard, PixelButton, PixelChip, PixelTypography, TerminalLine, PixelSidebar } from './pixel';
import PdfViewerOnCanvas from './PdfViewerOnCanvas';
import ArticleMarkdownContent from './articles/ArticleMarkdownContent';

const DEFAULT_META = {
  title: 'HandyWote',
  description: 'HandyWote 的文章与技术分享。'
};

const stripMarkdown = (text = '') => {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const ensureMetaTag = (attr, key, content) => {
  if (typeof document === 'undefined' || !key) return null;
  let selector = `meta[${attr}="${key}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  if (content) {
    tag.setAttribute('content', content);
  }
  return tag;
};

const setMetaName = (name, content) => {
  if (!content) return;
  ensureMetaTag('name', name, content);
};

const setMetaProperty = (property, content) => {
  if (!content) return;
  ensureMetaTag('property', property, content);
};

const setCanonicalLink = (url) => {
  if (typeof document === 'undefined' || !url) return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
};

const setJsonLd = (data) => {
  if (typeof document === 'undefined' || !data) return;
  let script = document.getElementById('article-json-ld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-json-ld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

const removeJsonLd = () => {
  if (typeof document === 'undefined') return;
  const script = document.getElementById('article-json-ld');
  if (script && script.parentNode) {
    script.parentNode.removeChild(script);
  }
};

const resolveAssetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window !== 'undefined' && path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  const base = getApiUrl.baseUrl();
  const normalizedBase = base && base.endsWith('/') ? base.slice(0, -1) : base || '';
  if (path.startsWith('/')) {
    return `${normalizedBase}${path}`;
  }
  return normalizedBase ? `${normalizedBase}/${path}` : path;
};

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const defaultMetaRef = useRef(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!defaultMetaRef.current) {
      const originalDescription = document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content');
      defaultMetaRef.current = {
        title: document.title || DEFAULT_META.title,
        description: originalDescription || DEFAULT_META.description
      };
    }
  }, []);

  useEffect(() => {
    if (!article || typeof document === 'undefined') return;

    const baseTitle = article.title
      ? `${article.title} - HandyWote`
      : (defaultMetaRef.current?.title || DEFAULT_META.title);

    const descriptionSource =
      article.summary ||
      stripMarkdown(article.content || '').slice(0, 160);
    const resolvedDescription =
      descriptionSource || defaultMetaRef.current?.description || DEFAULT_META.description;

    const canonicalUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/articles/${article.id}`
        : '';

    const coverUrl = resolveAssetUrl(article.cover);

    document.title = baseTitle;
    setMetaName('description', resolvedDescription);
    if (canonicalUrl) {
      setCanonicalLink(canonicalUrl);
    }
    setMetaProperty('og:title', baseTitle);
    setMetaProperty('og:description', resolvedDescription);
    if (canonicalUrl) {
      setMetaProperty('og:url', canonicalUrl);
    }
    setMetaProperty('og:type', 'article');
    setMetaProperty('og:site_name', 'HandyWote');
    if (coverUrl) {
      setMetaProperty('og:image', coverUrl);
      setMetaName('twitter:image', coverUrl);
    }
    setMetaName('twitter:card', coverUrl ? 'summary_large_image' : 'summary');
    setMetaName('twitter:title', baseTitle);
    setMetaName('twitter:description', resolvedDescription);
    if (canonicalUrl) {
      setMetaName('twitter:url', canonicalUrl);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title || defaultMetaRef.current?.title || DEFAULT_META.title,
      description: resolvedDescription,
      author: {
        '@type': 'Person',
        name: 'HandyWote'
      },
      datePublished: article.created_at || article.updated_at || null,
      dateModified: article.updated_at || article.created_at || null,
      image: coverUrl || undefined,
      url: canonicalUrl || undefined,
      inLanguage: 'zh-CN',
      keywords: Array.isArray(article.tags)
        ? article.tags.join(', ')
        : article.tags
    };
    setJsonLd(structuredData);

    return () => {
      if (defaultMetaRef.current) {
        document.title = defaultMetaRef.current.title || DEFAULT_META.title;
        setMetaName('description', defaultMetaRef.current.description || DEFAULT_META.description);
      }
      removeJsonLd();
    };
  }, [article]);

  // 获取文章详情
  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl.articleDetail(id));

      if (response.ok) {
        const data = await response.json();
        const rawArticle = unwrapApiPayload(data);
        // 将 Tags 字符串转换为数组
        const processedArticle = rawArticle ? {
          ...rawArticle,
          tags: typeof rawArticle.tags === 'string'
            ? rawArticle.tags.split(',').filter(t => t.trim())
            : rawArticle.tags || []
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

  // 获取文章评论
  const fetchComments = useCallback(async () => {
    if (!article || demoMode) return;
    
    try {
      setCommentsLoading(true);
      const response = await fetch(getApiUrl.articleComments(article.id));
      
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的评论数据:', data); // 添加调试日志
        const payload = unwrapApiPayload(data);
        setComments(payload?.comments || []);
      } else {
        console.error('获取评论失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [article, demoMode]);

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentAuthor.trim() || demoMode) return;
    
    try {
      setSubmittingComment(true);
      const response = await fetch(getApiUrl.createComment(article.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: commentAuthor.trim(),
          email: '',  // 可选邮箱字段
          content: newComment.trim(),
        }),
      });
      
      if (response.ok) {
        // 清空输入框
        setNewComment('');
        setCommentAuthor('');
        
        // 重新获取评论列表
        await fetchComments();
        
        // 显示成功消息
        alert('评论发布成功！');
      } else if (response.status === 429) {
        // 处理评论限制错误
        const errorData = await response.json();
        alert(getApiMessage(errorData, '评论发布频率过高，请稍后再试'));
      } else {
        throw new Error('评论发布失败');
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      alert('评论发布失败，请稍后重试');
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // 在文章加载完成后获取评论
  useEffect(() => {
    if (article && !demoMode) {
      fetchComments();
    }
  }, [article, demoMode, fetchComments]);

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
        alert('链接已复制到剪贴板');
      });
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="text" height={40} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mb: 4 }} />
        <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => window.history.back()}
        >
          返回
        </Button>
      </Container>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <PixelContainer section>
      <TerminalLine>cat article/{id}.md</TerminalLine>

      {/* 文章 */}
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr' },
          gap: 'clamp(12px, 2vw, 24px)',
          alignItems: 'start',
        }}
      >

        {/* 右侧内容区 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)' }}>
          {/* 返回按钮 */}
          <PixelButton variant="ghost" startIcon={<ArrowBack />} component={Link} to="/articles">
            返回文章列表
          </PixelButton>

          {/* 演示模式提示 */}
          {demoMode && (
            <Alert severity="info" sx={{ mb: 0 }}>
              当前处于演示模式，显示的是示例文章内容。评论功能在演示模式下不可用。
            </Alert>
          )}

          <PixelCard>
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
                    {formatDate(article.created_at)}
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

                <IconButton size="small" onClick={handleShare} aria-label="分享文章">
                  <ShareIcon />
                </IconButton>
              </Box>

              {article.summary && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {article.summary}
                </Typography>
              )}
            </Box>

            {/* 文章内容 */}
            <Box
              sx={{
                minHeight: { xs: '300px', sm: '400px', md: '500px' },
                height: { xs: 'auto', sm: '100%' },
                overflow: 'auto',
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 4,
                  mb: 2,
                  fontWeight: 'bold'
                },
                '& p': {
                  mb: 2,
                  lineHeight: 1.8
                },
                '& ul, & ol': {
                  mb: 2,
                  pl: 3
                },
                '& li': {
                  mb: 1
                },
                '& blockquote': {
                  borderLeft: '4px solid #2196F3',
                  pl: 2,
                  ml: 0,
                  fontStyle: 'italic',
                  color: 'text.secondary'
                },
                '& code': {
                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                  color: '#58a6ff',
                  px: 1,
                  py: 0.5,
                  borderRadius: 0,
                  fontSize: '0.9em',
                  fontFamily: "'JetBrains Mono', monospace",
                },
                '& pre': {
                  mb: 3
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  my: 2
                },
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  mb: 3
                },
                '& th, & td': {
                  border: '1px solid #30363d',
                  p: 1,
                  textAlign: 'left'
                },
                '& th': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#e5e5e5'
                }
              }}
            >
              {article.content_type === 'pdf' ? (
                // PDF内容渲染
                <PdfViewerOnCanvas filename={article.pdf_filename} />
              ) : (
                // Markdown内容渲染
                <ArticleMarkdownContent content={article.content} />
              )}
            </Box>
          </PixelCard>

          {/* 评论区 */}
          <PixelCard>
            <Typography variant="h5" gutterBottom sx={{ fontFamily: 'monospace' }}>
              $ comments --list ({comments.length})
            </Typography>

            {/* 发表评论 */}
            <Box sx={{ mb: 4 }}>
              {demoMode && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  演示模式下评论功能不可用，请启动后端服务后重试。
                </Alert>
              )}

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="$ name"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    disabled={demoMode}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="$ message"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={demoMode}
                sx={{ mb: 2 }}
              />

              <PixelButton
                variant="primary"
                startIcon={<SendIcon />}
                disabled={demoMode || !newComment.trim() || !commentAuthor.trim() || submittingComment}
                onClick={handleSubmitComment}
              >
                {submittingComment ? '> submitting...' : '> submit'}
              </PixelButton>
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* 评论列表 */}
            {commentsLoading ? (
              <Box textAlign="center" sx={{ py: 2 }}>
                <Typography color="text.secondary">loading...</Typography>
              </Box>
            ) : comments.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {comments.map((comment) => (
                  <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {comment.author.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                          {comment.author}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, fontFamily: 'monospace' }}>
                        {comment.content}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ fontFamily: 'monospace' }}>
                // no comments yet
              </Typography>
            )}
          </PixelCard>
        </Box>
      </Box>
    </PixelContainer>
  );
};

export default ArticleDetail;
