import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Pagination,
  Skeleton,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

// 演示数据
const DEMO_ARTICLES = [
  {
    id: 1,
    title: 'React 18 新特性详解',
    summary: '深入探讨 React 18 带来的并发特性、自动批处理、Suspense 改进等新功能，以及如何在实际项目中应用这些特性。',
    category: '前端开发',
    tags: ['React', 'JavaScript', '前端', '并发'],
    views: 1250,
    comment_count: 3,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    title: 'Python Flask 最佳实践',
    summary: '分享在 Flask 开发中的最佳实践，包括项目结构、配置管理、数据库操作、API 设计等方面的经验总结。',
    category: '后端开发',
    tags: ['Python', 'Flask', '后端', 'API'],
    views: 890,
    comment_count: 1,
    created_at: '2024-01-10T14:20:00Z'
  },
  {
    id: 3,
    title: '现代 CSS 布局技术',
    summary: '介绍现代 CSS 布局技术，包括 Flexbox、Grid、CSS Container Queries 等，以及如何在实际项目中灵活运用这些技术。',
    category: '前端开发',
    tags: ['CSS', '布局', 'Flexbox', 'Grid'],
    views: 756,
    comment_count: 2,
    created_at: '2024-01-05T09:15:00Z'
  }
];

const DEMO_CATEGORIES = ['前端开发', '后端开发', '移动开发', '数据库', '运维部署'];
const DEMO_TAGS = {
  'React': 2,
  'JavaScript': 1,
  '前端': 2,
  '并发': 1,
  'Python': 1,
  'Flask': 1,
  '后端': 1,
  'API': 1,
  'CSS': 1,
  '布局': 1,
  'Flexbox': 1,
  'Grid': 1
};

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [demoMode, setDemoMode] = useState(false);

  // 获取文章列表
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        per_page: 9
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);

      const response = await fetch(`${API_BASE_URL}/articles?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles);
        setTotalPages(data.pages);
        setDemoMode(false);
      } else {
        throw new Error('API 请求失败');
      }
    } catch (err) {
      console.log('后端服务不可用，切换到演示模式');
      setDemoMode(true);
      // 使用演示数据
      let filteredArticles = [...DEMO_ARTICLES];
      
      if (searchTerm) {
        filteredArticles = filteredArticles.filter(article =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (selectedCategory) {
        filteredArticles = filteredArticles.filter(article =>
          article.category === selectedCategory
        );
      }
      
      if (selectedTag) {
        filteredArticles = filteredArticles.filter(article =>
          article.tags.includes(selectedTag)
        );
      }
      
      setArticles(filteredArticles);
      setTotalPages(Math.ceil(filteredArticles.length / 9));
    } finally {
      setLoading(false);
    }
  };

  // 获取分类和标签
  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/categories`),
        fetch(`${API_BASE_URL}/tags`)
      ]);

      if (categoriesResponse.ok && tagsResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        const tagsData = await tagsResponse.json();
        setCategories(categoriesData);
        setTags(tagsData);
        setDemoMode(false);
      } else {
        throw new Error('API 请求失败');
      }
    } catch (err) {
      console.log('使用演示分类和标签数据');
      setCategories(DEMO_CATEGORIES);
      setTags(DEMO_TAGS);
      setDemoMode(true);
    }
  };

  useEffect(() => {
    fetchCategoriesAndTags();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [currentPage, searchTerm, selectedCategory, selectedTag]);

  // 处理搜索
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  // 处理分类筛选
  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    setCurrentPage(1);
  };

  // 处理标签筛选
  const handleTagClick = (tag) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
    setCurrentPage(1);
  };

  // 处理分页
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 分享文章
  const handleShare = (article) => {
    const url = `${window.location.origin}/articles/${article.id}`;
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
      day: 'numeric'
    });
  };

  // 卡片动画变体
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (error) {
    return (
      <Box id="articles" sx={{ py: 8, minHeight: '100vh' }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <section id="articles" className="section">
      <Container>
        {/* 主要内容容器，带有淡入动画效果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-effect"
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          {/* 演示模式提示 */}
          {demoMode && (
            <Alert severity="info" sx={{ mb: 4 }}>
              当前处于演示模式，显示的是示例数据。要使用完整功能，请启动后端服务。
            </Alert>
          )}

          {/* 标题 */}
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{ textAlign: 'center', mb: 4, fontSize: { xs: '2rem', sm: '3rem' } }}
          >
            我的文章
          </Typography>

        {/* 搜索和筛选区域 */}
        <Box sx={{ 
          mb: 6,
          '& .MuiTextField-root': {
            '@media (prefers-color-scheme: dark)': {
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }
              }
            }
          },
          '& .MuiFormControl-root': {
            '@media (prefers-color-scheme: dark)': {
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }
              }
            }
          }
        }}>
          <Grid container spacing={3} alignItems="stretch">
            {/* 搜索框 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="搜索文章..."
                value={searchTerm}
                onChange={handleSearch}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '50px !important', // 强制统一高度
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    '& fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.23)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.87)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main'
                    }
                  },
                  '& .MuiInputBase-input': {
                    height: '50px !important',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1rem',
                    padding: '16px 14px',
                    boxSizing: 'border-box'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* 分类筛选 */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '1rem' }}>分类</InputLabel>
                <Select
                  value={selectedCategory}
                  label="分类"
                  onChange={handleCategoryChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '50px !important', // 强制统一高度
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box'
                    },
                    '& .MuiOutlinedInput-input': {
                      height: '50px !important', // 强制统一高度
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '1rem',
                      padding: '16px 14px',
                      boxSizing: 'border-box'
                    },
                    '& .MuiSelect-select': {
                      height: '50px !important', // 强制统一高度
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '1rem',
                      padding: '16px 14px',
                      boxSizing: 'border-box',
                      lineHeight: '50px'
                    },
                    '& .MuiInputBase-input': {
                      height: '50px !important',
                      boxSizing: 'border-box'
                    }
                  }}
                >
                  <MenuItem value="">全部</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 清除筛选 */}
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedTag('');
                  setCurrentPage(1);
                }}
                fullWidth
                sx={{
                  height: '50px !important', // 强制统一高度
                  fontSize: '1rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px 14px',
                  textTransform: 'none',
                  boxSizing: 'border-box'
                }}
              >
                清除筛选
              </Button>
            </Grid>
          </Grid>

          {/* 标签筛选 */}
          {Object.keys(tags).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                标签筛选:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(tags).map(([tag, count]) => (
                  <Chip
                    key={tag}
                    label={`${tag} (${count})`}
                    clickable
                    color={selectedTag === tag ? 'primary' : 'default'}
                    onClick={() => handleTagClick(tag)}
                    variant={selectedTag === tag ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* 文章列表 */}
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} key={index}>
                <Card sx={{ height: '200px', display: 'flex', flexDirection: 'row' }}>
                  <Skeleton variant="rectangular" sx={{ width: '200px', height: '200px', flexShrink: 0 }} />
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ mb: 1 }} />
                      <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
                      <Skeleton variant="text" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" height={20} sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                        <Skeleton variant="rectangular" width={60} height={24} />
                        <Skeleton variant="rectangular" width={60} height={24} />
                        <Skeleton variant="rectangular" width={60} height={24} />
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={32} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : articles.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              暂无文章
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {articles.map((article, index) => (
                <Grid item xs={12} key={article.id}>
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      sx={{
                        height: '200px', // 固定高度
                        display: 'flex',
                        flexDirection: 'row', // 水平布局
                        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        '@media (prefers-color-scheme: dark)': {
                          backgroundColor: 'rgba(30, 30, 30, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#e5e5e5'
                        },
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          '@media (prefers-color-scheme: dark)': {
                            boxShadow: '0 8px 25px rgba(255,255,255,0.1)'
                          }
                        }
                      }}
                    >
                      {/* 封面图片 */}
                      {article.cover_image && (
                        <CardMedia
                          component="img"
                          sx={{ 
                            width: '200px', // 固定宽度
                            height: '200px', // 固定高度
                            objectFit: 'cover',
                            flexShrink: 0 // 防止图片被压缩
                          }}
                          image={`${API_BASE_URL.replace('/api', '')}${article.cover_image}`}
                          alt={article.title}
                        />
                      )}

                      <CardContent sx={{ 
                        flexGrow: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.5rem'
                      }}>
                        <Box>
                          {/* 分类 */}
                          <Chip
                            label={article.category}
                            size="small"
                            color="primary"
                            sx={{ 
                              alignSelf: 'flex-start', 
                              mb: 1,
                              height: '24px',
                              fontSize: '0.75rem'
                            }}
                          />

                          {/* 标题 */}
                          <Typography
                            variant="h6"
                            component={RouterLink}
                            to={`/articles/${article.id}`}
                            sx={{
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              '&:hover': { color: 'primary.main' },
                              textDecoration: 'none',
                              color: 'inherit',
                              fontSize: '1.25rem',
                              lineHeight: 1.3,
                              mb: 1,
                              mt: 0,
                              pt: 0
                            }}
                          >
                            {article.title}
                          </Typography>

                          {/* 摘要 */}
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2, flexGrow: 1 }}
                          >
                            {article.summary}
                          </Typography>

                          {/* 标签 */}
                          {article.tags && article.tags.length > 0 && (
                            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {article.tags.slice(0, 3).map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {article.tags.length > 3 && (
                                <Chip
                                  label={`+${article.tags.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          )}

                          {/* 统计信息 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <VisibilityIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {article.views}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CommentIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {article.comment_count}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(article.created_at)}
                              </Typography>
                            </Box>
                          </Box>

                          {/* 操作按钮 */}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              fullWidth
                              component={RouterLink}
                              to={`/articles/${article.id}`}
                            >
                              阅读全文
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleShare(article)}
                            >
                              <ShareIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            {/* 分页 */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
        </motion.div>
      </Container>
    </section>
  );
};

export default Articles; 