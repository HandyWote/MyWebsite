// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useState, lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

// 路由级别懒加载
const Navbar = lazy(() => import('./components/Navbar'));
const Home = lazy(() => import('./components/Home'));
const Projects = lazy(() => import('./components/Projects'));
const Articles = lazy(() => import('./components/Articles'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const AdminRoutes = lazy(() => import('./admin/routes'));

// 创建自定义主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // 将主色调改为 rgb(25, 118, 210)
    },
  },
});

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  
  return (
    <>
      {!isAdmin && (
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px' }}>
            <CircularProgress />
          </Box>
        }>
          <Navbar />
        </Suspense>
      )}
      <Routes>
        {/* 文章详情页面路由 */}
        <Route path="/articles/:id" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
            </Box>
          }>
            <ArticleDetail />
          </Suspense>
        } />
        {/* 主页面路由 */}
        <Route path="/" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
            </Box>
          }>
            <>
              <Home />    {/* 首页介绍 */}
              <Projects />{/* 项目展示组件 */}
            </>
          </Suspense>
        } />
        
        {/* 独立文章页面路由 */}
        <Route path="/articles" element={
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
            </Box>
          }>
            <Articles />
          </Suspense>
        } />
      </Routes>
    </>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false); // 添加暗模式状态

  return (
    <ThemeProvider theme={theme}>
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
                  <CircularProgress />
                </Box>
              }>
                <AdminRoutes />
              </Suspense>
            } />
            
        </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
