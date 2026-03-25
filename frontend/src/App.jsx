// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PixelProvider } from './components/pixel';

// 路由级别懒加载
const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const ContentTabs = lazy(() => import('./components/ContentTabs'));
const ArticleList = lazy(() => import('./components/ArticleList'));
const ProjectList = lazy(() => import('./components/ProjectList'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AdminRoutes = lazy(() => import('./admin/routes'));
const routerBasename = ['/', './'].includes(import.meta.env.BASE_URL)
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, '');

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
  return (
    <PixelProvider>
      <Router basename={routerBasename}>
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
