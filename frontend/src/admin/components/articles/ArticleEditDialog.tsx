import { useState, useCallback, type ChangeEvent } from 'react';
import {
  Stack,
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { PixelButton, PixelDialog, PixelInput } from '@/components/pixel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import MarkdownUploadPreview from './MarkdownUploadPreview';
import PdfUploadPreview from './PdfUploadPreview';
import useArticleStore from '@/stores/articleStore';
import useUploadStore from '@/stores/uploadStore';
import useAiStore from '@/stores/aiStore';
import type { AppliedSuggestions } from '@/stores/aiStore';
import useNotification from '../../../hooks/useNotification';
import {
  AdminDialogSection,
  AdminFieldGrid,
  AdminFieldGridItem,
  AdminFormStack,
} from '../ui';
import type { AiSuggestions, ArticleFormValues } from '@/api/types';

const DEFAULT_COVER = '/default-cover.svg';

export interface ArticleEditDialogProps {
  open: boolean;
  isEdit: boolean;
  /** 初始文章数据（打开时同步到本地表单状态）。 */
  article?: Partial<ArticleFormValues>;
  onClose: () => void;
  /** 保存回调：拿到完整表单值。 */
  onSave: (values: ArticleFormValues) => void;
}

/** 表单里由输入框编辑的文本字段（其余字段来自单选框与上传）。 */
type ArticleFormTextField = 'title' | 'category' | 'tags' | 'summary';

const validateTags = (tags: string) => /^[一-龥a-zA-Z0-9_,\-\s]+$/.test(tags);

const createInitialForm = (article?: Partial<ArticleFormValues>): ArticleFormValues => ({
  title: article?.title || '',
  category: article?.category || '',
  tags: article?.tags || '',
  summary: article?.summary || '',
  content: article?.content || '',
  content_type: article?.content_type || 'markdown',
  cover: article?.cover || '',
  pdf_filename: article?.pdf_filename || '',
});

/** 封面地址：无封面用本地占位图，其余原样使用（相对路径即同源站点路径）。 */
const getCoverUrl = (cover?: string) => (cover ? cover : DEFAULT_COVER);

/**
 * ArticleEditDialog - 文章编辑对话框
 * 直接从 store 读取上传/AI 状态，自主管理表单交互。
 *
 * Props（精简为 5 个）：
 *   open     - 是否显示
 *   isEdit   - 是否编辑模式
 *   article  - 初始文章数据（打开时同步到本地状态）
 *   onClose  - 关闭回调
 *   onSave   - 保存回调（接收最终文章数据）
 */
const ArticleEditDialogForm = ({ open, isEdit, article, onClose, onSave }: ArticleEditDialogProps) => {
  // ========== 本地表单状态 ==========
  const [form, setForm] = useState<ArticleFormValues>(() => createInitialForm(article));

  // ========== Store 状态 ==========
  const loading: boolean = useArticleStore((state) => state.loading);

  const {
    coverUploading,
    pdfUploading,
    uploadCover,
    uploadPdf,
  } = useUploadStore();

  const {
    aiSuggestions,
    loading: aiLoading,
    analyzeContent,
    applySuggestions,
  } = useAiStore();

  const notify = useNotification();

  // ========== 表单操作 ==========
  const handleFieldChange = useCallback((field: ArticleFormTextField) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    }, []);

  const handleContentTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newType = e.target.value;

    setForm((prev) => ({
      ...prev,
      content_type: newType,
    }));
  };

  // ========== 封面上传 ==========
  const handleUploadCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadCover(file);
      setForm((prev) => ({ ...prev, cover: url }));
      notify.success('封面上传成功');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  // ========== PDF 上传 ==========
  const handleUploadPdf = async (file: File) => {
    if (!file) return;

    try {
      const filename = await uploadPdf(file);
      setForm((prev) => ({ ...prev, pdf_filename: filename }));
      notify.success('PDF 上传成功');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  // ========== AI 分析 ==========
  const handleAiAnalyze = async () => {
    if (!form.title?.trim() || !form.content?.trim()) {
      notify.warning('请先填写标题和内容');
      return;
    }

    try {
      await analyzeContent(form.title, form.content, form.summary || '');
      notify.success('AI 分析完成！请查看建议');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleApplySuggestions = () => {
    const normalized = applySuggestions();
    if (!normalized) return;

    setForm((prev) => ({
      ...prev,
      category: normalized.category || prev.category,
      tags: normalized.tags.length > 0 ? normalized.tags.join(',') : prev.tags,
      summary: normalized.summary || prev.summary,
    }));
    notify.success('AI 建议已应用');
  };

  // ========== Markdown 错误处理 ==========
  const handleMarkdownError = (message: string, severity: 'error' | 'warning' = 'error') => {
    notify[severity](message);
  };

  // ========== Markdown 文件名自动填充标题 ==========
  const handleFileNameChange = (nameWithoutExt: string) => {
    if (!isEdit && !form.title) {
      setForm((prev) => ({ ...prev, title: nameWithoutExt }));
    }
  };

  // ========== 渲染 ==========
  const canAnalyze = (form.title || '').trim() && (
    form.content_type === 'markdown'
      ? (form.content || '').trim()
      : true
  );
  const tagsInvalid = !!form.tags && !validateTags(form.tags);

  return (
    <PixelDialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      title={isEdit ? '编辑文章' : '新增文章'}
      actions={(
        <>
          <PixelButton variant="text" onClick={onClose}>
            取消
          </PixelButton>
          <PixelButton
            variant="contained"
            onClick={() => onSave(form)}
            disabled={loading}
          >
            保存
          </PixelButton>
        </>
      )}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        选择内容类型并填写文章信息，支持 Markdown 和 PDF 两种格式
      </Typography>
      <AdminFormStack spacing={3}>
        <AdminDialogSection title="基础信息" subtitle="文章标题、分类、标签与摘要">
          <AdminFieldGrid>
            <AdminFieldGridItem>
              <PixelInput
                fullWidth
                label="标题"
                value={form.title || ''}
                onChange={handleFieldChange('title')}
                required
              />
            </AdminFieldGridItem>
            <AdminFieldGridItem size={{ xs: 12, md: 6 }}>
              <PixelInput
                fullWidth
                label="分类"
                value={form.category || ''}
                onChange={handleFieldChange('category')}
              />
            </AdminFieldGridItem>
            <AdminFieldGridItem size={{ xs: 12, md: 6 }}>
              <PixelInput
                fullWidth
                label="标签（逗号分隔）"
                value={form.tags || ''}
                onChange={handleFieldChange('tags')}
                error={tagsInvalid}
                helperText={tagsInvalid ? '标签格式不合法' : ''}
              />
            </AdminFieldGridItem>
            <AdminFieldGridItem>
              <PixelInput
                fullWidth
                label="摘要"
                value={form.summary || ''}
                onChange={handleFieldChange('summary')}
                multiline
                minRows={3}
              />
            </AdminFieldGridItem>
          </AdminFieldGrid>
        </AdminDialogSection>

        <AdminDialogSection title="内容类型" subtitle="选择文章的内容格式">
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={form.content_type || 'markdown'}
              onChange={handleContentTypeChange}
            >
              <FormControlLabel
                value="markdown"
                control={<Radio />}
                label={(
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DescriptionIcon color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Markdown 文本</Typography>
                      <Typography variant="caption" color="text.secondary">支持富文本编辑和代码高亮</Typography>
                    </Box>
                  </Box>
                )}
              />
              <FormControlLabel
                value="pdf"
                control={<Radio />}
                label={(
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PictureAsPdfIcon color="error" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>PDF 文件</Typography>
                      <Typography variant="caption" color="text.secondary">上传PDF文档作为内容</Typography>
                    </Box>
                  </Box>
                )}
              />
            </RadioGroup>
          </FormControl>
        </AdminDialogSection>

        <AdminDialogSection title="封面与媒体" subtitle="上传封面图片，增强文章的视觉表现">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <PixelButton variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={coverUploading}>
              上传封面
              <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
            </PixelButton>
            {form.cover && (
              <Box
                component="img"
                src={getCoverUrl(form.cover)}
                alt="封面"
                sx={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 0, border: '1px solid', borderColor: 'divider' }}
                onError={(e) => {
                  // Box 的 component="img" 保留 EventTarget 类型的 target，需窄化为图片元素
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = getCoverUrl(form.cover);
                }}
              />
            )}
            {coverUploading && <Typography color="text.secondary">上传中...</Typography>}
          </Stack>
        </AdminDialogSection>

        <AdminDialogSection
          title="AI 帮助填写"
          subtitle="根据标题与正文自动生成分类、标签和摘要"
          icon={<SmartToyIcon color="primary" sx={{ fontSize: 28 }} />}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Tooltip title="需要填写标题和内容才能进行AI分析">
              <span>
                <PixelButton
                  variant="contained"
                  startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                  onClick={handleAiAnalyze}
                  disabled={aiLoading || !canAnalyze}
                  size="medium"
                  sx={{ minWidth: 140, fontWeight: 600 }}
                >
                  {aiLoading ? '分析中...' : '开始分析'}
                </PixelButton>
              </span>
            </Tooltip>
          </Stack>

          {aiSuggestions && (
            <Alert
              severity="success"
              sx={{
                bgcolor: 'success.50',
                border: '1px solid',
                borderColor: 'success.200',
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  AI分析建议：
                </Typography>
                {aiSuggestions.category && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>建议分类：</strong>
                    {aiSuggestions.category}
                  </Typography>
                )}
                {Array.isArray(aiSuggestions.tags) && aiSuggestions.tags.length > 0 && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>建议标签：</strong>
                    {aiSuggestions.tags.join(', ')}
                  </Typography>
                )}
                {aiSuggestions.suggested_summary && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>建议摘要：</strong>
                    {aiSuggestions.suggested_summary}
                  </Typography>
                )}
              </Box>
              <PixelButton variant="outlined" size="small" onClick={handleApplySuggestions}>
                应用建议
              </PixelButton>
            </Alert>
          )}
        </AdminDialogSection>

        {form.content_type === 'markdown' ? (
          <AdminDialogSection title="正文内容" subtitle="上传 Markdown 文件，标题将自动从文件名提取">
            <MarkdownUploadPreview
              content={form.content || ''}
              onContentChange={(value: string) => setForm((prev) => ({ ...prev, content: value }))}
              onError={handleMarkdownError}
              onFileNameChange={handleFileNameChange}
            />
          </AdminDialogSection>
        ) : (
          <AdminDialogSection title="PDF 文件" subtitle="上传 PDF，支持在线预览">
            <PdfUploadPreview
              filename={form.pdf_filename}
              onUpload={handleUploadPdf}
              uploading={pdfUploading}
              onClear={() => setForm((prev) => ({ ...prev, pdf_filename: '' }))}
            />
          </AdminDialogSection>
        )}
      </AdminFormStack>
    </PixelDialog>
  );
};

const ArticleEditDialog = (props: ArticleEditDialogProps) => (
  <ArticleEditDialogForm
    key={`${props.open ? 'open' : 'closed'}-${props.article?.id ?? 'new'}`}
    {...props}
  />
);

export default ArticleEditDialog;
