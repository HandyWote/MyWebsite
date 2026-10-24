import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Add, Upload, SettingsSuggest, Delete } from '@mui/icons-material';
import { PixelButton, PixelConfirmDialog } from '@/components/pixel';

// Store
import useArticleStore from '@/stores/articleStore';
import useUploadStore from '@/stores/uploadStore';

// 子组件
import { ArticleList, ArticleImporter } from './articles';
import type { ArticleImportResult } from './articles/ArticleImporter';
import ArticleEditDialog from './articles/ArticleEditDialog';
import AiSettingsDialog from './articles/AiSettingsDialog';

// Hook
import useNotification from '../../hooks/useNotification';

import type {
  Article,
  ArticleFormValues,
  ArticleImportStats,
  ArticlePagination,
  ArticleInput,
  ArticleSummary,
} from '@/api/types';

/**
 * 本容器只声明读写的 store 切片已随 store 类型化而移除：
 * 状态用 api/types.ts 的领域类型，动作签名由 `@/stores/articleStore` 自身给出。
 */

/** 删除确认的目标（单篇 / 批量）。 */
type DeleteConfirmTarget = { type: 'single'; id: number } | { type: 'batch' };

// 默认文章结构
const defaultArticle: ArticleFormValues = {
  title: '',
  category: '',
  tags: '',
  summary: '',
  content: '',
  cover: '',
  content_type: 'markdown',
  pdf_filename: '',
};

/**
 * 文章管理容器组件
 * 职责：UI 状态管理、子组件组合、事件协调。
 * 子组件内部通过 store 自取上传/AI 状态，不再需要透传中间操作 props。
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
    importMarkdown,
  } = useUploadStore();

  // ========== UI 状态（局部）==========
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleFormValues>(defaultArticle);
  const [editId, setEditId] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 删除确认对话框
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmTarget | null>(null);

  // 通知
  const notify = useNotification();

  // ========== 初始化 ==========
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ========== 文章列表操作 ==========
  const handleCreate = () => {
    setEditingArticle(defaultArticle);
    setEditId(null);
    setEditDialogOpen(true);
  };

  const handleEdit = async (article: ArticleSummary) => {
    try {
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
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (formData: ArticleFormValues) => {
    // 验证
    if (!formData.title) {
      notify.error('标题必填');
      return;
    }
    if (formData.content_type === 'markdown' && !formData.content) {
      notify.error('Markdown 内容必填');
      return;
    }
    if (formData.content_type === 'pdf' && !formData.pdf_filename) {
      notify.error('PDF 文件必填');
      return;
    }
    if (formData.tags && !/^[一-龥a-zA-Z0-9_,\-\s]+$/.test(formData.tags)) {
      notify.error('标签格式不合法');
      return;
    }

    try {
      if (editId) {
        await updateArticle(editId, formData);
        notify.success('文章更新成功');
      } else {
        await createArticle(formData);
        notify.success('文章创建成功');
      }
      setEditDialogOpen(false);
      setEditingArticle(defaultArticle);
      setEditId(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'single') {
        await deleteArticle(deleteConfirm.id);
        notify.success('文章删除成功');
      } else if (deleteConfirm.type === 'batch') {
        await batchDeleteArticles(selectedIds);
        setSelectedIds([]);
        notify.success('批量删除成功');
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm({ type: 'single', id });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    setDeleteConfirm({ type: 'batch' });
  };

  // ========== 批量导入 ==========
  const handleImport = async (files: File[]): Promise<ArticleImportResult> => {
    try {
      const result = await importMarkdown(files);
      const stats: ArticleImportStats = result || {};
      const successCount = (stats.markdown || 0) + (stats.pdf || 0);
      notify.success(`成功导入 ${successCount} 篇文章`);
      return { success: successCount, failed: (stats.failed || []).length };
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
      return { success: 0, failed: files.length };
    }
  };

  // ========== 渲染 ==========
  return (
    <Box>
      {/* 工具栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <PixelButton variant="contained" startIcon={<Add />} onClick={handleCreate}>
          新建文章
        </PixelButton>
        <PixelButton
          variant="outlined"
          startIcon={<Upload />}
          onClick={() => setImportDialogOpen(true)}
        >
          批量导入
        </PixelButton>
        <PixelButton
          variant="outlined"
          startIcon={<SettingsSuggest />}
          onClick={() => setAiSettingsOpen(true)}
        >
          AI 设置
        </PixelButton>
        {selectedIds.length > 0 && (
          <PixelButton
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleBatchDelete}
          >
            删除选中 ({selectedIds.length})
          </PixelButton>
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
        onPageChange={(page: number) => fetchArticles({ page })}
        onRowsPerPageChange={(perPage: number) => fetchArticles({ page: 1, perPage })}
      />

      {/* 编辑对话框（精简为 5 个 props）*/}
      <ArticleEditDialog
        open={editDialogOpen}
        isEdit={Boolean(editId)}
        article={editingArticle}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingArticle(defaultArticle);
          setEditId(null);
        }}
        onSave={handleSave}
      />

      {/* AI 设置对话框（仅 2 个 props）*/}
      <AiSettingsDialog
        open={aiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
      />

      {/* 批量导入对话框 */}
      <ArticleImporter
        open={importDialogOpen}
        onImport={handleImport}
        onClose={() => setImportDialogOpen(false)}
      />

      {/* 删除确认对话框 */}
      <PixelConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'batch' ? '批量删除确认' : '确认删除'}
        message={deleteConfirm?.type === 'batch'
          ? `确定删除选中的 ${selectedIds.length} 篇文章？`
          : '确定删除该文章？'}
        confirmText="确认删除"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onClose={() => setDeleteConfirm(null)}
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
            bgcolor: 'action.disabledBackground',
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
