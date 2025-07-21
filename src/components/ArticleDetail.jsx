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
  Grid
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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE_URL = 'http://localhost:5000/api';

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
  setCount(c => c + 1); // 会批处理
  setFlag(f => !f);     // 会批处理
}, 1000);
\`\`\`

### 2. Suspense 改进

Suspense 现在支持服务端渲染，并且可以更好地处理数据获取。

\`\`\`javascript
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SomeComponent />
    </Suspense>
  );
}
\`\`\`

## 新的 Hooks

### useTransition

\`useTransition\` 让你能够标记某些状态更新为非紧急的。

\`\`\`javascript
import { useTransition } from 'react';

function App() {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(0);

  function handleClick() {
    startTransition(() => {
      setCount(c => c + 1);
    });
  }

  return (
    <div>
      {isPending && <Spinner />}
      <button onClick={handleClick}>{count}</button>
    </div>
  );
}
\`\`\`

## 总结

React 18 的这些新特性让我们的应用更加高效和用户友好。通过并发特性，我们可以提供更好的用户体验，而新的 Hooks 则让我们能够更好地控制应用的性能。

建议在实际项目中逐步采用这些新特性，以获得最佳的性能提升。`,
    category: '前端开发',
    tags: ['React', 'JavaScript', '前端', '并发'],
    views: 1250,
    comment_count: 3,
    created_at: '2024-01-15T10:30:00Z',
    comments: [
      {
        id: 1,
        author: '前端开发者',
        content: '这篇文章写得很好，对 React 18 的新特性解释得很清楚！',
        created_at: '2024-01-15T11:00:00Z'
      },
      {
        id: 2,
        author: 'React 爱好者',
        content: 'useTransition 这个 Hook 真的很实用，感谢分享！',
        created_at: '2024-01-15T12:30:00Z'
      },
      {
        id: 3,
        author: '技术博主',
        content: '自动批处理确实是个很大的改进，期待在项目中使用。',
        created_at: '2024-01-15T14:15:00Z'
      }
    ]
  },
  {
    id: 2,
    title: 'Python Flask 最佳实践',
    summary: '分享在 Flask 开发中的最佳实践，包括项目结构、配置管理、数据库操作、API 设计等方面的经验总结。',
    content: `# Python Flask 最佳实践

Flask 是一个轻量级的 Python Web 框架，虽然简单，但要构建大型应用还是需要一些最佳实践。

## 项目结构

推荐的项目结构如下：

\`\`\`
myapp/
├── app/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── templates/
│   └── static/
├── config.py
├── requirements.txt
└── run.py
\`\`\`

## 配置管理

使用工厂模式创建应用：

\`\`\`python
# app/__init__.py
from flask import Flask
from config import config

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # 初始化扩展
    db.init_app(app)
    
    # 注册蓝图
    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    return app
\`\`\`

## 数据库操作

使用 SQLAlchemy 进行数据库操作：

\`\`\`python
# app/models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    
    def __repr__(self):
        return f'<User {self.username}>'
\`\`\`

## API 设计

设计 RESTful API：

\`\`\`python
# app/routes.py
from flask import jsonify, request
from .models import User

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'email': user.email
    } for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = User(
        username=data['username'],
        email=data['email']
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created successfully'}), 201
\`\`\`

## 错误处理

统一的错误处理：

\`\`\`python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
\`\`\`

## 总结

遵循这些最佳实践可以让你的 Flask 应用更加健壮和可维护。记住要合理组织代码结构，使用适当的配置管理，并做好错误处理。`,
    category: '后端开发',
    tags: ['Python', 'Flask', '后端', 'API'],
    views: 890,
    comment_count: 1,
    created_at: '2024-01-10T14:20:00Z',
    comments: [
      {
        id: 1,
        author: 'Python 开发者',
        content: '项目结构的建议很实用，感谢分享！',
        created_at: '2024-01-10T15:00:00Z'
      }
    ]
  },
  {
    id: 3,
    title: '现代 CSS 布局技术',
    summary: '介绍现代 CSS 布局技术，包括 Flexbox、Grid、CSS Container Queries 等，以及如何在实际项目中灵活运用这些技术。',
    content: `# 现代 CSS 布局技术

现代 CSS 提供了强大的布局工具，让我们能够创建更加灵活和响应式的网页设计。

## Flexbox

Flexbox 是一维布局模型，适合处理行或列的布局。

### 基本用法

\`\`\`css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.item {
  flex: 1;
  margin: 10px;
}
\`\`\`

### 常用属性

- \`justify-content\`: 主轴对齐
- \`align-items\`: 交叉轴对齐
- \`flex-direction\`: 主轴方向
- \`flex-wrap\`: 换行方式

## CSS Grid

Grid 是二维布局模型，可以同时处理行和列。

### 基本用法

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  grid-gap: 20px;
  grid-template-areas: 
    "header header header"
    "sidebar main main"
    "footer footer footer";
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
\`\`\`

## CSS Container Queries

容器查询是 CSS 的新特性，允许根据容器的大小来应用样式。

\`\`\`css
.card {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
\`\`\`

## 响应式设计

结合使用这些技术创建响应式布局：

\`\`\`css
/* 移动端 */
@media (max-width: 768px) {
  .container {
    display: flex;
    flex-direction: column;
  }
}

/* 桌面端 */
@media (min-width: 769px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
  }
}
\`\`\`

## 最佳实践

1. **渐进增强**: 从基础布局开始，逐步添加高级特性
2. **浏览器支持**: 使用 \`@supports\` 检查特性支持
3. **性能考虑**: 避免过度使用复杂的布局
4. **可访问性**: 确保布局对屏幕阅读器友好

## 总结

现代 CSS 布局技术让我们能够创建更加灵活和强大的网页设计。合理使用这些技术，可以大大提升用户体验和开发效率。`,
    category: '前端开发',
    tags: ['CSS', '布局', 'Flexbox', 'Grid'],
    views: 756,
    comment_count: 2,
    created_at: '2024-01-05T09:15:00Z',
    comments: [
      {
        id: 1,
        author: 'CSS 爱好者',
        content: 'Grid 布局真的很强大，感谢详细的解释！',
        created_at: '2024-01-05T10:00:00Z'
      },
      {
        id: 2,
        author: '前端工程师',
        content: 'Container Queries 是个很实用的新特性。',
        created_at: '2024-01-05T11:30:00Z'
      }
    ]
  }
];

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 获取文章详情
  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/articles/${id}`);
      
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

  useEffect(() => {
    fetchArticle();
  }, [id]);

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentAuthor.trim() || !commentContent.trim()) {
      alert('请填写昵称和评论内容');
      return;
    }

    if (demoMode) {
      alert('演示模式下评论功能不可用，请启动后端服务后重试');
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await fetch(`${API_BASE_URL}/articles/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: commentAuthor.trim(),
          content: commentContent.trim()
        })
      });

      if (response.ok) {
        setCommentContent('');
        // 重新获取文章以更新评论列表
        fetchArticle();
      } else {
        alert('评论提交失败，请稍后重试');
      }
    } catch (err) {
      alert('网络错误，请稍后重试');
    } finally {
      setSubmittingComment(false);
    }
  };

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

  // Markdown 代码块渲染
  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={tomorrow}
        language={match[1]}
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
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
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
        <Paper 
          elevation={2} 
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
          {/* 分类和标签 */}
          <Box sx={{ mb: 3 }}>
            <Chip
              label={article.category}
              color="primary"
              sx={{ mr: 2 }}
            />
            {article.tags && article.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                variant="outlined"
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>

          {/* 标题 */}
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              mb: 3,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {article.title}
          </Typography>

          {/* 摘要 */}
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 3, fontStyle: 'italic' }}
          >
            {article.summary}
          </Typography>

          {/* 统计信息和操作 */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {article.views} 次阅读
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CommentIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {article.comments.length} 条评论
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(article.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton
                  color="primary"
                  onClick={handleShare}
                  sx={{ mr: 1 }}
                >
                  <ShareIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* 封面图片 */}
        {article.cover_image && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <img
              src={`${API_BASE_URL.replace('/api', '')}${article.cover_image}`}
              alt={article.title}
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        )}

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
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock
              }}
            >
              {article.content}
            </ReactMarkdown>
          </Box>
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
            评论 ({article.comments.length})
          </Typography>

          {/* 发表评论 */}
          <Box sx={{ mb: 4 }}>
            {demoMode && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                演示模式下评论功能不可用，请启动后端服务后重试。
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="昵称"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="请输入您的昵称"
                disabled={demoMode}
              />
              <TextField
                fullWidth
                label="评论内容"
                multiline
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="请输入您的评论..."
                disabled={demoMode}
              />
              <Box>
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleSubmitComment}
                  disabled={demoMode || submittingComment || !commentAuthor.trim() || !commentContent.trim()}
                >
                  {submittingComment ? '提交中...' : '发表评论'}
                </Button>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 评论列表 */}
          {article.comments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              暂无评论，快来发表第一条评论吧！
            </Typography>
          ) : (
            <Box>
              {article.comments.map((comment, index) => (
                <Box key={comment.id} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {comment.author.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
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
                  {index < article.comments.length - 1 && (
                    <Divider sx={{ mt: 3 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Paper>
        </motion.div>
      </Container>
    </section>
  );
};

export default ArticleDetail; 