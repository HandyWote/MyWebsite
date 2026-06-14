// frontend/src/admin/components/ArticlesManager.jsx
import { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add, Upload, SettingsSuggest, Delete } from '@mui/icons-material';

// Store
import useArticleStore from '@/stores/articleStore';
import useUploadStore from '@/stores/uploadStore';
import useAiStore from '@/stores/aiStore';

// 配置
import { getApiUrl } from '@/config/api';

// 子组件
import { ArticleList, ArticleImporter } from './articles';
import ArticleEditDialog from './articles/ArticleEditDialog';
import AiSettingsDialog from './articles/AiSettingsDialog';

// Hook
import useNotification from '../../hooks/useNotification';

// 默认文章结构
const defaultArticle = {
  title: '',
  category: '',
  tags: '',
  summary: '',
  content: '',
  cover: '',
  content_type: 'markdown',
  pdf_filename: '',
};

const DEFAULT_COVER = `${import.meta.env.BASE_URL}default-cover.svg`;

/**
 * 文章管理容器组件
 * 职责：UI 状态管理、子组件组合、事件协调
 */
export default function ArticlesManager() {
  // ========== Store 状态和方法 ==========
  const {
    articles,
    loading,
    pagination,
    fetchArticles,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    batchDeleteArticles,
  } = useArticleStore();

  const {
    coverPreview,
    coverUploading,
    pdfUploading,
    uploadCover,
    uploadPdf,
    importMarkdown,
  } = useUploadStore();

  const {
    aiAnalysis,
    aiSuggestions,
    loading: aiLoading,
    settingsLoading,
    analyzeContent,
    fetchAiSettings,
    updateAiSettings,
    testAiConnection,
    applySuggestions,
  } = useAiStore();

  // ========== UI 状态（局部）==========
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(defaultArticle);
  const [editId, setEditId] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettingsForm, setAiSettingsForm] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // 通知
  const notify = useNotification();

  // ========== 初始化 ==========
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ========== 辅助函数 ==========
  const getCoverUrl = (cover) => {
    if (!cover) return DEFAULT_COVER;
    if (/^https?:\/\//.test(cover)) return cover;
    return `${getApiUrl.baseUrl()}${cover}`;
  };

  const validateTags = (tags) => /^[一-龥a-zA-Z0-9_,\-\s]+$/.test(tags);

  // ========== 文章列表操作 ==========
  const handleCreate = () => {
    setEditingArticle(defaultArticle);
    setEditId(null);
    setEditDialogOpen(true);
  };

  const handleEdit = async (article) => {
    try {
      // 获取完整文章详情
      const fullArticle = await fetchArticleById(article.id);
      setEditingArticle({
        ...defaultArticle,
        ...fullArticle,
        tags: typeof fullArticle.tags === 'string'
          ? fullArticle.tags
          : (fullArticle.tags || []).join(','),
      });
      setEditId(article.id);
      setEditDialogOpen(true);
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleSave = async () => {
    // 验证
    if (!editingArticle.title) {
      notify.notify().error('标题必填');
      return;
    }
    if (editingArticle.content_type === 'markdown' && !editingArticle.content) {
      notify.notify().error('Markdown 内容必填');
      return;
    }
    if (editingArticle.content_type === 'pdf' && !editingArticle.pdf_filename) {
      notify.notify().error('PDF 文件必填');
      return;
    }
    if (editingArticle.tags && !validateTags(editingArticle.tags)) {
      notify.notify().error('标签格式不合法');
      return;
    }

    try {
      if (editId) {
        await updateArticle(editId, editingArticle);
        notify.notify().success('文章更新成功');
      } else {
        await createArticle(editingArticle);
        notify.notify().success('文章创建成功');
      }
      setEditDialogOpen(false);
      setEditingArticle(defaultArticle);
      setEditId(null);
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该文章？')) return;
    try {
      await deleteArticle(id);
      notify.notify().success('文章删除成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 篇文章？`)) return;
    try {
      await batchDeleteArticles(selectedIds);
      setSelectedIds([]);
      notify.notify().success('批量删除成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  // ========== 文件上传 ==========
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadCover(file);
      setEditingArticle((prev) => ({ ...prev, cover: url }));
      notify.notify().success('封面上传成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;

    try {
      const filename = await uploadPdf(file);
      setEditingArticle((prev) => ({ ...prev, pdf_filename: filename }));
      notify.notify().success('PDF 上传成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  // ========== AI 分析 ==========
  const handleAiAnalyze = async () => {
    if (!editingArticle.title?.trim() || !editingArticle.content?.trim()) {
      notify.notify().warning('请先填写标题和内容');
      return;
    }

    try {
      await analyzeContent(
        editingArticle.title,
        editingArticle.content,
        editingArticle.summary || ''
      );
      notify.notify().success('AI 分析完成！请查看建议');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleApplyAiSuggestions = () => {
    const normalized = applySuggestions();
    if (!normalized) return;

    setEditingArticle((prev) => ({
      ...prev,
      category: normalized.category || prev.category,
      tags: normalized.tags.length > 0 ? normalized.tags.join(',') : prev.tags,
      summary: normalized.summary || prev.summary,
    }));
    notify.notify().success('AI 建议已应用');
  };

  // ========== AI 设置 ==========
  const handleOpenAiSettings = async () => {
    setAiSettingsOpen(true);
    try {
      const settings = await fetchAiSettings();
      setAiSettingsForm(settings);
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleSaveAiSettings = async () => {
    try {
      await updateAiSettings(aiSettingsForm);
      notify.notify().success('AI 设置保存成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleTestAiSettings = async () => {
    try {
      await testAiConnection(aiSettingsForm);
      notify.notify().success('AI 连接测试成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  // ========== 批量导入 ==========
  const handleImport = async (files) => {
    try {
      const result = await importMarkdown(files);
      const stats = result || {};
      const successCount = (stats.markdown || 0) + (stats.pdf || 0);
      notify.notify().success(`成功导入 ${successCount} 篇文章`);
      return { success: successCount, failed: (stats.failed || []).length };
    } catch (err) {
      notify.notify().error(err.message);
      return { success: 0, failed: files.length };
    }
  };

  // ========== 渲染 ==========
  return (
    <Box>
      {/* 工具栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          新建文章
        </Button>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
        >
          批量导入
        </Button>
        <Button
          variant="outlined"
          startIcon={<SettingsSuggest />}
          onClick={handleOpenAiSettings}
        >
          AI 设置
        </Button>
        {selectedIds.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleBatchDelete}
          >
            删除选中 ({selectedIds.length})
          </Button>
        )}
      </Box>

      {/* 文章列表 */}
      <ArticleList
        articles={articles}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        pagination={pagination}
        onPageChange={(page) => fetchArticles({ page })}
        onRowsPerPageChange={(perPage) => fetchArticles({ page: 1, perPage })}
      />

      {/* 编辑对话框 */}
      <ArticleEditDialog
        open={editDialogOpen}
        loading={loading}
        isEdit={Boolean(editId)}
        article={editingArticle}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingArticle(defaultArticle);
          setEditId(null);
        }}
        onSave={handleSave}
        onArticleChange={setEditingArticle}
        validateTags={validateTags}
        fileUploading={coverUploading}
        onUploadCover={handleUploadCover}
        coverPreview={getCoverUrl(editingArticle.cover)}
        aiAnalyzing={aiLoading}
        aiSuggestions={aiSuggestions}
        onAiAnalyze={handleAiAnalyze}
        onApplySuggestions={handleApplyAiSuggestions}
        onMarkdownError={(message, severity) => notify.notify()[severity](message)}
        onUploadPdf={handleUploadPdf}
        pdfUploading={pdfUploading}
      />

      {/* AI 设置对话框 */}
      <AiSettingsDialog
        open={aiSettingsOpen}
        loading={settingsLoading}
        saving={settingsLoading}
        testing={settingsLoading}
        settings={aiSettingsForm || {}}
        onClose={() => setAiSettingsOpen(false)}
        onChange={setAiSettingsForm}
        onSave={handleSaveAiSettings}
        onTest={handleTestAiSettings}
      />

      {/* 批量导入对话框 */}
      <ArticleImporter
        open={importDialogOpen}
        onImport={handleImport}
        onClose={() => setImportDialogOpen(false)}
      />

      {/* 全局加载遮罩 */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(255,255,255,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6">加载中...</Typography>
        </Box>
      )}
    </Box>
  );
}
