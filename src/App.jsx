// 导入所需的组件
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Projects from './components/Projects';
import Articles from './components/Articles';
import ArticleDetail from './components/ArticleDetail';
import AdminRoutes from './admin/routes';

/**
 * App组件 - 应用程序的根组件
 * 负责组织和渲染所有主要页面组件
 * 支持路由功能，包括文章详情页面
 */

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
        {/* 管理后台路由 */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        {/* 主页面路由，只保留首页合并内容 */}
        <Route path="/" element={
          <>
            <Home />    {/* 首页介绍 */}
            {/* 关于我、技能、联系内容已合并到 Home.jsx 内部或直接在此插入 */}
            <Projects />{/* 项目展示组件 */}
            <Articles />{/* 文章组件 */}
          </>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
