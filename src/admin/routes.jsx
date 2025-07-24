import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import SiteContentEditor from './components/SiteContentEditor';
import SkillsManager from './components/SkillsManager';
import ContactsManager from './components/ContactsManager';
import AvatarsManager from './components/AvatarsManager';
import ArticlesManager from './components/ArticlesManager';
import ArticleEditor from './components/ArticleEditor';
import DataImportExport from './components/DataImportExport';
import AboutManager from './components/AboutManager';
import React from 'react';

// 登录守卫组件
function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
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
        <Route path="articles/new" element={<ArticleEditor />} />
        <Route path="articles/:id/edit" element={<ArticleEditor />} />
        <Route path="data" element={<DataImportExport />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
}
