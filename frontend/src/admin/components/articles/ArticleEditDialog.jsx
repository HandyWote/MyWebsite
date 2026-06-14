import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
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
import { getApiUrl } from '@/config/api';
import { ConfirmDialog } from '../shared';
import useNotification from '../../../hooks/useNotification';

const SectionCard = ({ icon, title, subtitle, children, spacing = 2 }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing,
      bgcolor: 'background.paper',
    }}
  >
    {(title || subtitle) && (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {icon && <Box sx={{ mt: 0.5 }}>{icon}</Box>}
        <Box>
          {title && (
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    )}
    {children}
  </Paper>
);

const DEFAULT_COVER = `${import.meta.env.BASE_URL}default-cover.svg`;

const validateTags = (tags) => /^[一-龥a-zA-Z0-9_,\-\s]+$/.test(tags);

const getCoverUrl = (cover) => {
  if (!cover) return DEFAULT_COVER;
  if (/^https?:\/\//.test(cover)) return cover;
  return `${getApiUrl.baseUrl()}${cover}`;
};

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
const ArticleEditDialog = ({ open, isEdit, article, onClose, onSave }) => {
  // ========== 本地表单状态 ==========
  const [form, setForm] = useState({
    title: '',
    category: '',
    tags: '',
    summary: '',
    content: '',
    content_type: 'markdown',
    cover: '',
    pdf_filename: '',
  });

  // 内容类型切换确认对话框
  const [switchConfirm, setSwitchConfirm] = useState(null); // null | 'pdf' | 'markdown'

  // ========== Store 状态 ==========
  const loading = useArticleStore((s) => s.loading);

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

  // ========== 同步 prop → 本地状态 ==========
  useEffect(() => {
    if (open && article) {
      setForm({
        title: article.title || '',
        category: article.category || '',
        tags: article.tags || '',
        summary: article.summary || '',
        content: article.content || '',
        content_type: article.content_type || 'markdown',
        cover: article.cover || '',
        pdf_filename: article.pdf_filename || '',
      });
    }
  }, [open, article]);

  // ========== 表单操作 ==========
  const handleFieldChange = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleContentTypeChange = (e) => {
    const newType = e.target.value;
    const oldType = form.content_type;

    // 从 Markdown 切换到 PDF，且存在 Markdown 内容
    if (newType === 'pdf' && oldType === 'markdown' && form.content) {
      setSwitchConfirm('pdf');
      return;
    }
    // 从 PDF 切换到 Markdown，且存在 PDF 文件
    if (newType === 'markdown' && oldType === 'pdf' && form.pdf_filename) {
      setSwitchConfirm('markdown');
      return;
    }

    setForm((prev) => ({
      ...prev,
      content_type: newType,
      content: newType === 'pdf' ? '' : prev.content,
      pdf_filename: newType === 'markdown' ? '' : prev.pdf_filename,
    }));
  };

  const confirmContentTypeSwitch = () => {
    const newType = switchConfirm === 'pdf' ? 'pdf' : 'markdown';
    setForm((prev) => ({
      ...prev,
      content_type: newType,
      content: newType === 'pdf' ? '' : prev.content,
      pdf_filename: newType === 'markdown' ? '' : prev.pdf_filename,
    }));
    setSwitchConfirm(null);
  };

  // ========== 封面上传 ==========
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadCover(file);
      setForm((prev) => ({ ...prev, cover: url }));
      notify.notify().success('封面上传成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  // ========== PDF 上传 ==========
  const handleUploadPdf = async (file) => {
    if (!file) return;

    try {
      const filename = await uploadPdf(file);
      setForm((prev) => ({ ...prev, pdf_filename: filename }));
      notify.notify().success('PDF 上传成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  // ========== AI 分析 ==========
  const handleAiAnalyze = async () => {
    if (!form.title?.trim() || !form.content?.trim()) {
      notify.notify().warning('请先填写标题和内容');
      return;
    }

    try {
      await analyzeContent(form.title, form.content, form.summary || '');
      notify.notify().success('AI 分析完成！请查看建议');
    } catch (err) {
      notify.notify().error(err.message);
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
    notify.notify().success('AI 建议已应用');
  };

  // ========== Markdown 错误处理 ==========
  const handleMarkdownError = (message, severity = 'error') => {
    notify.notify()[severity](message);
  };

  // ========== Markdown 文件名自动填充标题 ==========
  const handleFileNameChange = (nameWithoutExt) => {
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

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1.5 }}>
          {isEdit ? '编辑文章' : '新增文章'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            选择内容类型并填写文章信息，支持 Markdown 和 PDF 两种格式
          </Typography>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            background: 'linear-gradient(180deg, rgba(25,118,210,0.04) 0%, rgba(25,118,210,0.01) 100%)',
          }}
        >
          <Stack spacing={3} sx={{ mt: 1 }}>
            <SectionCard title="基础信息" subtitle="文章标题、分类、标签与摘要">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="标题"
                    value={form.title || ''}
                    onChange={handleFieldChange('title')}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="分类"
                    value={form.category || ''}
                    onChange={handleFieldChange('category')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="标签（逗号分隔）"
                    value={form.tags || ''}
                    onChange={handleFieldChange('tags')}
                    fullWidth
                    error={!!form.tags && !validateTags(form.tags)}
                    helperText={!!form.tags && !validateTags(form.tags) ? '标签格式不合法' : ''}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="摘要"
                    value={form.summary || ''}
                    onChange={handleFieldChange('summary')}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="内容类型" subtitle="选择文章的内容格式">
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={form.content_type || 'markdown'}
                  onChange={handleContentTypeChange}
                >
                  <FormControlLabel
                    value="markdown"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon color="primary" />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Markdown 文本</Typography>
                          <Typography variant="caption" color="text.secondary">支持富文本编辑和代码高亮</Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="pdf"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PictureAsPdfIcon color="error" />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>PDF 文件</Typography>
                          <Typography variant="caption" color="text.secondary">上传PDF文档作为内容</Typography>
                        </Box>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </SectionCard>

            <SectionCard title="封面与媒体" subtitle="上传封面图片，增强文章的视觉表现">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={coverUploading}>
                  上传封面
                  <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
                </Button>
                {form.cover && (
                  <Box
                    component="img"
                    src={getCoverUrl(form.cover)}
                    alt="封面"
                    sx={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 0, border: '1px solid', borderColor: 'divider' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getCoverUrl(form.cover);
                    }}
                  />
                )}
                {coverUploading && <Typography color="text.secondary">上传中...</Typography>}
              </Stack>
            </SectionCard>

            <SectionCard
              title="AI 帮助填写"
              subtitle="根据标题与正文自动生成分类、标签和摘要"
              icon={<SmartToyIcon color="primary" sx={{ fontSize: 28 }} />}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Tooltip title="需要填写标题和内容才能进行AI分析">
                  <span>
                    <Button
                      variant="contained"
                      startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                      onClick={handleAiAnalyze}
                      disabled={aiLoading || !canAnalyze}
                      size="medium"
                      sx={{ minWidth: 140, fontWeight: 600 }}
                    >
                      {aiLoading ? '分析中...' : '开始分析'}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              {aiSuggestions && (
                <Alert
                  severity="success"
                  sx={{
                    mt: 2,
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
                    {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
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
                  <Button variant="outlined" size="small" onClick={handleApplySuggestions}>
                    应用建议
                  </Button>
                </Alert>
              )}
            </SectionCard>

            {form.content_type === 'markdown' ? (
              <SectionCard title="正文内容" subtitle="上传 Markdown 文件，标题将自动从文件名提取">
                <MarkdownUploadPreview
                  content={form.content || ''}
                  onContentChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                  onError={handleMarkdownError}
                  onFileNameChange={handleFileNameChange}
                />
              </SectionCard>
            ) : (
              <SectionCard title="PDF 文件" subtitle="上传 PDF，支持在线预览">
                <PdfUploadPreview
                  filename={form.pdf_filename}
                  onUpload={handleUploadPdf}
                  uploading={pdfUploading}
                  onClear={() => setForm((prev) => ({ ...prev, pdf_filename: '' }))}
                />
              </SectionCard>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={() => onSave(form)} variant="contained" disabled={loading}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 内容类型切换确认 */}
      <ConfirmDialog
        open={Boolean(switchConfirm)}
        title="确认切换内容类型"
        message={switchConfirm === 'pdf'
          ? '切换为PDF将清空现有Markdown内容，是否继续？'
          : '切换为Markdown将移除现有PDF文件，是否继续？'}
        confirmText="确认切换"
        severity="warning"
        onConfirm={confirmContentTypeSwitch}
        onCancel={() => setSwitchConfirm(null)}
        onClose={() => setSwitchConfirm(null)}
      />
    </>
  );
};

export default ArticleEditDialog;
