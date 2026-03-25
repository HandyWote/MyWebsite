// frontend/src/admin/components/ArticlesManager.jsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Button, Snackbar, Alert, CircularProgress, Typography } from '@mui/material';
import { Add, Upload, SettingsSuggest, AutoAwesome, Delete } from '@mui/icons-material';

// Store
import useArticleStore from '@/stores/articleStore';

// 配置
import { getApiUrl } from '@/config/api';

// 子组件
import { ArticleList, ArticleImporter } from './articles';
import ArticleEditDialog from './articles/ArticleEditDialog';
import AiSettingsDialog from './articles/AiSettingsDialog';

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

const DEFAULT_COVER = '/default-cover.svg';

/**
 * 文章管理容器组件
 * 职责：UI 状态管理、子组件组合、事件协调
 */
export default function ArticlesManager() {
  // ========== Store 状态和方法 ==========
  const {
    articles,
    loading,
    error,
    pagination,
    aiAnalysis,
    aiLoading,
    aiSettings,
    aiSettingsLoading,
    fetchArticles,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    batchDeleteArticles,
    uploadCover,
    uploadPdf,
    importMarkdown,
    analyzeContent,
    clearAiAnalysis,
    fetchAiSettings,
    updateAiSettings,
    testAiConnection,
  } = useArticleStore();

  // ========== UI 状态（局部）==========
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(defaultArticle);
  const [editId, setEditId] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettingsForm, setAiSettingsForm] = useState(null); // AI 设置表单（本地编辑状态）
  const [selectedIds, setSelectedIds] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // ========== 初始化 ==========
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ========== 辅助函数 ==========
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const getCoverUrl = (cover) => {
    if (!cover) return DEFAULT_COVER;
    if (/^https?:\/\//.test(cover)) return cover;
    return `${getApiUrl.baseUrl()}${cover}`;
  };

  const validateTags = (tags) => /^[\u4e00-\u9fa5a-zA-Z0-9_,\-\s]+$/.test(tags);

  const normalizeAiSuggestions = (suggestions) => {
    if (!suggestions || typeof suggestions !== 'object') {
      return { category: '', tags: [], summary: '' };
    }

    const category = (suggestions.category || '').toString().trim();
    const summary = (suggestions.suggested_summary || suggestions.summary || '').toString().trim();

    let tags = [];
    if (Array.isArray(suggestions.tags)) {
      tags = suggestions.tags
        .map((item) => (item || '').toString().trim())
        .filter(Boolean);
    } else if (typeof suggestions.tags === 'string') {
      tags = suggestions.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return { category, tags, summary };
  };

  // ========== 文章列表操作 ==========
  const handleCreate = () => {
    setEditingArticle(defaultArticle);
    setEditId(null);
    setPreviewContent('');
    clearAiAnalysis();
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
      setPreviewContent(fullArticle.content || '');
      clearAiAnalysis();
      setEditDialogOpen(true);
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleSave = async () => {
    // 验证
    if (!editingArticle.title) {
      showSnackbar('标题必填', 'error');
      return;
    }
    if (editingArticle.content_type === 'markdown' && !editingArticle.content) {
      showSnackbar('Markdown 内容必填', 'error');
      return;
    }
    if (editingArticle.content_type === 'pdf' && !editingArticle.pdf_filename) {
      showSnackbar('PDF 文件必填', 'error');
      return;
    }
    if (editingArticle.tags && !validateTags(editingArticle.tags)) {
      showSnackbar('标签格式不合法', 'error');
      return;
    }

    try {
      if (editId) {
        await updateArticle(editId, editingArticle);
        showSnackbar('文章更新成功', 'success');
      } else {
        await createArticle(editingArticle);
        showSnackbar('文章创建成功', 'success');
      }
      setEditDialogOpen(false);
      setEditingArticle(defaultArticle);
      setEditId(null);
      clearAiAnalysis();
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该文章？')) return;
    try {
      await deleteArticle(id);
      showSnackbar('文章删除成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`确定删除选中的 ${selectedIds.length} 篇文章？`)) return;
    try {
      await batchDeleteArticles(selectedIds);
      setSelectedIds([]);
      showSnackbar('批量删除成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  // ========== 文件上传 ==========
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUploading(true);
    try {
      const url = await uploadCover(file);
      setEditingArticle((prev) => ({ ...prev, cover: url }));
      showSnackbar('封面上传成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setFileUploading(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;

    setPdfUploading(true);
    try {
      const filename = await uploadPdf(file);
      setEditingArticle((prev) => ({ ...prev, pdf_filename: filename }));
      showSnackbar('PDF 上传成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setPdfUploading(false);
    }
  };

  // ========== AI 分析 ==========
  const handleAiAnalyze = async () => {
    if (!editingArticle.title?.trim() || !editingArticle.content?.trim()) {
      showSnackbar('请先填写标题和内容', 'warning');
      return;
    }

    try {
      await analyzeContent(
        editingArticle.title,
        editingArticle.content,
        editingArticle.summary || ''
      );
      showSnackbar('AI 分析完成！请查看建议', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleApplyAiSuggestions = () => {
    if (!aiAnalysis) return;
    const normalized = normalizeAiSuggestions(aiAnalysis);

    setEditingArticle((prev) => ({
      ...prev,
      category: normalized.category || prev.category,
      tags: normalized.tags.length > 0 ? normalized.tags.join(',') : prev.tags,
      summary: normalized.summary || prev.summary,
    }));
    showSnackbar('AI 建议已应用', 'success');
  };

  // ========== AI 设置 ==========
  const handleOpenAiSettings = async () => {
    setAiSettingsOpen(true);
    try {
      const settings = await fetchAiSettings();
      setAiSettingsForm(settings);
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleSaveAiSettings = async () => {
    try {
      await updateAiSettings(aiSettingsForm);
      showSnackbar('AI 设置保存成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  const handleTestAiSettings = async () => {
    try {
      await testAiConnection(aiSettingsForm);
      showSnackbar('AI 连接测试成功', 'success');
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  // ========== 批量导入 ==========
  const handleImport = async (files) => {
    try {
      const result = await importMarkdown(files);
      const stats = result || {};
      const successCount = (stats.markdown || 0) + (stats.pdf || 0);
      showSnackbar(`成功导入 ${successCount} 篇文章`, 'success');
      return { success: successCount, failed: (stats.failed || []).length };
    } catch (err) {
      showSnackbar(err.message, 'error');
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
          clearAiAnalysis();
        }}
        onSave={handleSave}
        onArticleChange={setEditingArticle}
        validateTags={validateTags}
        fileUploading={fileUploading}
        onUploadCover={handleUploadCover}
        coverPreview={getCoverUrl(editingArticle.cover)}
        aiAnalyzing={aiLoading}
        aiSuggestions={aiAnalysis}
        onAiAnalyze={handleAiAnalyze}
        onApplySuggestions={handleApplyAiSuggestions}
        previewContent={previewContent}
        onPreviewContentChange={setPreviewContent}
        onMarkdownError={(message, severity) => showSnackbar(message, severity)}
        onUploadPdf={handleUploadPdf}
        pdfUploading={pdfUploading}
      />

      {/* AI 设置对话框 */}
      <AiSettingsDialog
        open={aiSettingsOpen}
        loading={aiSettingsLoading}
        saving={aiSettingsLoading}
        testing={aiSettingsLoading}
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

      {/* 全局提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

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
