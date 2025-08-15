// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useState, lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Projects from './components/Projects';
import Articles from './components/Articles';
import ArticleDetail from './components/ArticleDetail';
import AdminRoutes from './admin/routes';

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
      {!isAdmin && <Navbar />}
      <Routes>
        {/* 文章详情页面路由 */}
        <Route path="/articles/:id" element={<ArticleDetail />} />
        {/* 主页面路由 */}
        <Route path="/" element={
            <>
              <Home />    {/* 首页介绍 */}
              <Projects />{/* 项目展示组件 */}
              <Articles />{/* 文章组件 */}
            </>
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
