import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/Login';
import AdminLayout from './components/AdminLayout';
import SiteContentEditor from './components/SiteContentEditor';
import SkillsManager from './components/SkillsManager';
import ContactsManager from './components/ContactsManager';
import AvatarsManager from './components/AvatarsManager';
import ArticlesManager from './components/ArticlesManager';
import ArticleEditor from './components/ArticleEditor';
import LogsViewer from './components/LogsViewer';
import RecycleBin from './components/RecycleBin';
import DataImportExport from './components/DataImportExport';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="" element={<AdminLayout />}>
        <Route index element={<SiteContentEditor />} />
        <Route path="content" element={<SiteContentEditor />} />
        <Route path="skills" element={<SkillsManager />} />
        <Route path="contacts" element={<ContactsManager />} />
        <Route path="avatars" element={<AvatarsManager />} />
        <Route path="articles" element={<ArticlesManager />} />
        <Route path="articles/new" element={<ArticleEditor />} />
        <Route path="articles/:id/edit" element={<ArticleEditor />} />
        <Route path="logs" element={<LogsViewer />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
        <Route path="data" element={<DataImportExport />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
} 