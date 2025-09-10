import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { verifyToken, clearAuth, saveRedirectPath } from './utils/auth';

import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import AboutManager from './components/AboutManager';
import SkillsManager from './components/SkillsManager';
import ContactsManager from './components/ContactsManager';
import AvatarsManager from './components/AvatarsManager';
import ArticlesManager from './components/ArticlesManager';
import ArticleEditor from './components/ArticleEditor';
import CommentsManager from './components/CommentsManager';
import DataImportExport from './components/DataImportExport';

// 增强的登录守卫组件
function RequireAuth({ children }) {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    error: null
  });
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const result = await verifyToken();
      
      if (result.valid) {
        setAuthState({ loading: false, authenticated: true, error: null });
      } else {
        clearAuth();
        saveRedirectPath(location.pathname);
        setAuthState({ 
          loading: false, 
          authenticated: false, 
          error: result.error || '登录已过期，请重新登录' 
        });
      }
    };

    checkAuth();
  }, [location.pathname]);

  // 显示加载状态
  if (authState.loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Box>验证登录状态...</Box>
      </Box>
    );
  }

  // 认证失败，重定向到登录页
  if (!authState.authenticated) {
    return (
      <Navigate 
        to="/admin/login" 
        state={{ 
          from: location,
          message: authState.error 
        }} 
        replace 
      />
    );
  }

  // 认证成功，渲染子组件
  return children;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="" element={
        <RequireAuth>
          <AdminLayout />
        </RequireAuth>
      }>
        <Route index element={<AboutManager />} />
        <Route path="content" element={<AboutManager />} />
        <Route path="skills" element={<SkillsManager />} />
        <Route path="contacts" element={<ContactsManager />} />
        <Route path="avatars" element={<AvatarsManager />} />
        <Route path="articles" element={<ArticlesManager />} />
        <Route path="comments" element={<CommentsManager />} />
        <Route path="articles/new" element={<ArticleEditor />} />
        <Route path="articles/:id/edit" element={<ArticleEditor />} />
        <Route path="data" element={<DataImportExport />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
}
