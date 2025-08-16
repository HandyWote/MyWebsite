import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Box,
  Alert,
  Typography,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { getApiUrl } from '../config/api'; // 导入API配置

// 导入子组件
import ArticleCard from './ArticleCard';
import ArticleFilters from './ArticleFilters';
import ArticlePagination from './ArticlePagination';

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
    title: 'Mermaid 图表使用指南',
    summary: '学习如何使用 Mermaid 创建各种类型的图表，包括流程图、时序图、甘特图等，让文档更加生动直观。',
    category: '工具使用',
    tags: ['Mermaid', '图表', '文档', '可视化'],
    views: 520,
    comment_count: 2,
    created_at: '2024-01-20T16:45:00Z'
  },
  {
    id: 4,
    title: '现代 CSS 布局技术',
    summary: '介绍现代 CSS 布局技术，包括 Flexbox、Grid、CSS Container Queries 等，以及如何在实际项目中灵活运用这些技术。',
    category: '前端开发',
    tags: ['CSS', '布局', 'Flexbox', 'Grid'],
    views: 756,
    comment_count: 2,
    created_at: '2024-01-05T09:15:00Z'
  }
];

const DEMO_CATEGORIES = ['前端开发', '后端开发', '工具使用', '移动开发', '数据库', '运维部署'];
const DEMO_TAGS = {
  'React': 2,
  'JavaScript': 1,
  '前端': 2,
  '并发': 1,
  'Python': 1,
  'Flask': 1,
  '后端': 1,
  'API': 1,
  'Mermaid': 1,
  '图表': 1,
  '文档': 1,
  '可视化': 1,
  'CSS': 1,
  '布局': 1,
  'Flexbox': 1,
  'Grid': 1
};

/**
 * Articles组件 - 文章列表页面
 * 包含以下功能：
 * 1. 文章列表展示
 * 2. 搜索和筛选功能
 * 3. 分页功能
 * 4. 响应式设计
 * 5. 演示模式（当后端不可用时）
 */
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

      const response = await fetch(`${getApiUrl.articles()}?${params}`);
      
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
        fetch(getApiUrl.categories()),
        fetch(getApiUrl.tags())
      ]);

      if (categoriesResponse.ok && tagsResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        const tagsData = await tagsResponse.json();
        setCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
        setTags(tagsData.tags || {});
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
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }, []);

  // 处理分类筛选
  const handleCategoryChange = useCallback((event) => {
    setSelectedCategory(event.target.value);
    setCurrentPage(1);
  }, []);

  // 处理标签筛选
  const handleTagClick = useCallback((tag) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
    setCurrentPage(1);
  }, [selectedTag]);

  // 处理分页
  const handlePageChange = useCallback((event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 检查是否在独立页面
  const isStandalonePage = window.location.pathname === '/articles';

  // 清除所有筛选
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTag('');
    setCurrentPage(1);
  }, []);

  // 分享文章
  const handleShare = useCallback((article) => {
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
  }, []);

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
            margin: '0 auto',
            minHeight: '100vh'
          }}
        >
          {/* 演示模式提示 */}
          {demoMode && (
            <Alert severity="info" sx={{ mb: 4 }}>
              当前处于演示模式，显示的是示例数据。要使用完整功能，请启动后端服务。
            </Alert>
          )}

          {/* 返回按钮（仅在独立页面显示） */}
          {isStandalonePage && (
            <Box sx={{ mb: 4 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                component={RouterLink}
                to="/"
              >
                返回首页
              </Button>
            </Box>
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
          <ArticleFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedTag={selectedTag}
            onTagClick={handleTagClick}
            categories={categories}
            tags={tags}
            onClearFilters={handleClearFilters}
          />

          {/* 文章列表 */}
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ 
                    height: { xs: 'auto', sm: '200px', md: '220px' },
                    minHeight: { xs: '180px', sm: '200px', md: '220px' },
                    maxHeight: { xs: 'none', sm: '220px', md: '240px' },
                    display: 'flex', 
                    flexDirection: 'row', 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      width: { xs: '120px', sm: '160px', md: '180px' },
                      height: { xs: '120px', sm: '160px', md: '180px' },
                      backgroundColor: 'rgba(0,0,0,0.1)', 
                      flexShrink: 0,
                      borderRadius: 1,
                      m: { xs: 1, sm: 2 }
                    }} />
                    <Box sx={{ 
                      flexGrow: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      p: { xs: 1, sm: 2 },
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      <Box>
                        <Box sx={{ width: 80, height: 24, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '100%', height: 32, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '100%', height: 20, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1, mb: 1 }} />
                        <Box sx={{ width: '100%', height: 20, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1, mb: 2 }} />
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                          <Box sx={{ width: 60, height: 24, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
                          <Box sx={{ width: 60, height: 24, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ width: '100%', height: 32, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
                      </Box>
                    </Box>
                  </Box>
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
                    <ArticleCard
                      article={article}
                      index={index}
                      onShare={handleShare}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* 分页 */}
              <ArticlePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </motion.div>
      </Container>
    </section>
  );
};

export default Articles;
