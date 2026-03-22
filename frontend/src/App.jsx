// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PixelProvider } from './components/pixel';

// 路由级别懒加载
const PixelNavbar = lazy(() => import('./components/pixel/layout/PixelNavbar'));
const PixelFooter = lazy(() => import('./components/pixel/layout/PixelFooter'));
const Home = lazy(() => import('./components/Home'));
const Projects = lazy(() => import('./components/Projects'));
const Articles = lazy(() => import('./components/Articles'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AdminRoutes = lazy(() => import('./admin/routes'));

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <Box sx={{ pb: isAdmin ? 0 : '48px' }}>
      {!isAdmin && (
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '56px', bgcolor: 'background.paper' }}>
            <CircularProgress size={20} sx={{ color: 'primary.main' }} />
          </Box>
        }>
          <PixelNavbar />
        </Suspense>
      )}
      <Routes>
        {/* 文章详情页面路由 */}
        <Route path="/articles/:id" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <ArticleDetail />
          </Suspense>
        } />
        {/* 主页面路由 */}
        <Route path="/" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <>
              <Home />
              <Projects />
            </>
          </Suspense>
        } />

        {/* 独立文章页面路由 */}
        <Route path="/articles" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          }>
            <Articles />
          </Suspense>
        } />
      </Routes>
      {!isAdmin && <PixelFooter />}
    </Box>
  );
}

function App() {
  return (
    <PixelProvider>
      <Router>
        <Box sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          color: 'text.primary'
        }}>
          <Routes>
            {/* 前台页面 */}
            <Route path="/*" element={<AppContent />} />

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
        </Box>
      </Router>
    </PixelProvider>
  );
}

export default App;
