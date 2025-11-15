import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  Avatar,
  Divider,
  IconButton,
  Alert,
  Skeleton,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { getApiUrl } from '../config/api'; // 导入API配置
import PdfViewerOnCanvas from './PdfViewerOnCanvas';

// Mermaid 组件 - 使用动态导入避免同步渲染问题
const MermaidComponent = ({ code }) => {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 动态导入 mermaid
        const mermaid = (await import('mermaid')).default;
        
        // 配置 mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit'
        });

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 渲染图表
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('图表渲染失败');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      renderMermaid();
    }
  }, [code]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
        border: '1px dashed #ccc',
        borderRadius: 1,
        my: 2
      }}>
        <Typography color="text.secondary">正在渲染图表...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100px',
        border: '1px solid #f44336',
        borderRadius: 1,
        my: 2,
        bgcolor: '#ffebee'
      }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        my: 3,
        '& svg': {
          maxWidth: '100%',
          height: 'auto'
        }
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// Markdown 代码块渲染组件
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  // 如果是 mermaid 代码块，使用专门的 Mermaid 组件
  if (language === 'mermaid') {
    return <MermaidComponent code={code} />;
  }

  // 其他代码块使用语法高亮
  return !inline && match ? (
    <SyntaxHighlighter
      style={tomorrow}
      language={language}
      PreTag="div"
      customStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        padding: '16px',
        margin: '16px 0',
        '@media (prefers-color-scheme: dark)': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)'
        }
      }}
      {...props}
    >
      {code}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
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

  // 演示文章详情数据
  const DEMO_ARTICLES_DETAIL = [
    {
      id: 1,
      title: 'React 18 新特性详解',
      summary: '深入探讨 React 18 带来的并发特性、自动批处理、Suspense 改进等新功能，以及如何在实际项目中应用这些特性。',
      content: `# React 18 新特性详解

React 18 带来了许多激动人心的新特性，让我们一起来深入了解这些改进。

## 并发特性 (Concurrent Features)

### 1. 自动批处理 (Automatic Batching)

React 18 引入了自动批处理，这意味着所有的状态更新都会自动批处理，无需手动调用 \`ReactDOM.flushSync\`。

\`\`\`javascript
// React 18 之前
setTimeout(() => {
  setCount(c => c + 1); // 不会批处理
  setFlag(f => !f);     // 不会批处理
}, 1000);

// React 18
setTimeout(() => {
  setCount(c => c + 1); // 会自动批处理
  setFlag(f => !f);     // 会自动批处理
}, 1000);
\`\`\`

### 2. Mermaid 流程图示例

\`\`\`mermaid
flowchart TD
    A[React 18 新特性] --> B[并发特性]
    A --> C[Suspense 改进]
    A --> D[自动批处理]
    B --> E[useTransition]
    B --> F[useDeferredValue]
    C --> G[服务端渲染支持]
    D --> H[更好的性能]
\`\`\`

这个流程图展示了 React 18 的主要新特性之间的关系。`,
      category: 'React',
      tags: ['React', 'JavaScript', '前端开发'],
      cover: null,
      created_at: '2024-01-15T10:30:00',
      updated_at: '2024-01-15T10:30:00',
      views: 1250,
      comments: [
        {
          id: 1,
          author: '张三',
          content: '很详细的文章，对理解 React 18 很有帮助！',
          created_at: '2024-01-16T09:15:00'
        }
      ]
    }
  ];

  // 获取文章详情
  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl.articleDetail(id));
      
      if (response.ok) {
        const data = await response.json();
        setArticle(data);
        setDemoMode(false);
      } else {
        throw new Error('API 请求失败');
      }
    } catch (err) {
      console.log('后端服务不可用，切换到演示模式');
      setDemoMode(true);
      
      // 从演示数据中查找对应 ID 的文章
      const demoArticle = DEMO_ARTICLES_DETAIL.find(article => article.id === parseInt(id));
      
      if (demoArticle) {
        setArticle(demoArticle);
      } else {
        setError('文章不存在或已被删除');
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取文章评论
  const fetchComments = async () => {
    if (!article || demoMode) return;
    
    try {
      setCommentsLoading(true);
      const response = await fetch(getApiUrl.articleComments(article.id));
      
      if (response.ok) {
        const data = await response.json();
        console.log('获取到的评论数据:', data); // 添加调试日志
        setComments(data.data.comments || []); // 修复：应该是 data.data.comments
      } else {
        console.error('获取评论失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

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
        alert(errorData.msg || '评论发布频率过高，请稍后再试');
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
  }, [id]);

  // 在文章加载完成后获取评论
  useEffect(() => {
    if (article && !demoMode) {
      fetchComments();
    }
  }, [article, demoMode]);

  // 分享文章
  const handleShare = () => {
    const url = window.location.href;
    const text = `${article.title} - ${article.summary}`;
    
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
    <section className="section">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-effect"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '800px',
            margin: '0 auto',
            minHeight: '100vh'
          }}
        >
        {/* 返回按钮 */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => window.history.back()}
          >
            返回文章列表
          </Button>
        </Box>

        {/* 演示模式提示 */}
        {demoMode && (
          <Alert severity="info" sx={{ mb: 4 }}>
            当前处于演示模式，显示的是示例文章内容。评论功能在演示模式下不可用。
          </Alert>
        )}

        {/* 文章头部信息 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {article.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Chip 
              label={article.category} 
              color="primary" 
              size="small" 
            />
            {article.tags && article.tags.map((tag, index) => (
              <Chip 
                key={index} 
                label={tag} 
                variant="outlined" 
                size="small" 
              />
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
            
            <IconButton size="small" onClick={handleShare}>
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
        <Paper
          elevation={1}
          sx={{
            p: 4,
            mb: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '@media (prefers-color-scheme: dark)': {
              backgroundColor: 'rgba(30, 30, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e5e5e5'
            }
          }}
        >
          {article.content_type === 'pdf' ? (
            // PDF内容渲染
            <PdfViewerOnCanvas filename={article.pdf_filename} />
          ) : (
            // Markdown内容渲染
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
                  backgroundColor: 'grey.100',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.9em',
                  '@media (prefers-color-scheme: dark)': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#e5e5e5'
                  }
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
                  border: '1px solid #ddd',
                  p: 1,
                  textAlign: 'left'
                },
                '& th': {
                  backgroundColor: 'grey.100',
                  '@media (prefers-color-scheme: dark)': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#e5e5e5'
                  }
                }
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code: CodeBlock
                }}
              >
                {article.content}
              </ReactMarkdown>
            </Box>
          )}
        </Paper>

        {/* 评论区 */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '@media (prefers-color-scheme: dark)': {
              backgroundColor: 'rgba(30, 30, 30, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e5e5e5'
            }
          }}
        >
          <Typography variant="h5" gutterBottom>
            评论 ({comments.length})
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
                  label="昵称"
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
              label="写下你的评论..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={demoMode}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              disabled={demoMode || !newComment.trim() || !commentAuthor.trim() || submittingComment}
              onClick={handleSubmitComment}
            >
              {submittingComment ? '提交中...' : '发表评论'}
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 评论列表 */}
          {commentsLoading ? (
            <Box textAlign="center" sx={{ py: 2 }}>
              <Typography color="text.secondary">加载评论中...</Typography>
            </Box>
          ) : comments.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {comments.map((comment) => (
                <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ width: 40, height: 40 }}>
                    {comment.author.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {comment.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(comment.created_at)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {comment.content}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              暂无评论，快来发表第一条评论吧！
            </Typography>
          )}
        </Paper>
        </motion.div>
      </Container>
    </section>
  );
};

export default ArticleDetail;
