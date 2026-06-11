// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PixelProvider } from './components/pixel';
import useArticleStore from './stores/articleStore';

// 路由级别懒加载
const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const ContentTabs = lazy(() => import('./components/ContentTabs'));
const ArticleList = lazy(() => import('./components/ArticleList'));
const ProjectList = lazy(() => import('./components/ProjectList'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AdminRoutes = lazy(() => import('./admin/routes'));

// 动态 basename：/app/ 下使用 '/app'，SEO 路径（/articles/:id）下使用空字符串
const basename = window.location.pathname.startsWith('/app') ? '/app' : undefined;

function AppContent() {
  return (
    <Routes>
      {/* 使用 MainLayout 的嵌套路由 */}
      <Route path="/*" element={
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        }>
          <MainLayout />
        </Suspense>
      }>
        <Route element={<ContentTabs />}>
          <Route index element={<Navigate to="articles" replace />} />
          <Route path="articles" element={<ArticleList />} />
          <Route path="projects" element={<ProjectList />} />
        </Route>
        <Route path="articles/:id" element={<ArticleDetail />} />
      </Route>

      {/* 后台管理 */}
      <Route path="/admin/*" element={
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        }>
          <AdminRoutes />
        </Suspense>
      } />
    </Routes>
  );
}

function App() {
  // 注入 SEO 初始数据（如果有）
  useEffect(() => {
    useArticleStore.getState().injectInitialData();
  }, []);

  return (
    <PixelProvider>
      <Router basename={basename}>
        <Box sx={{
          minHeight: 'calc(100vh - 24px)',
          backgroundColor: 'background.default',
          color: 'text.primary',
          boxSizing: 'border-box',
        }}>
          <AppContent />
        </Box>
      </Router>
    </PixelProvider>
  );
}

export default App;
