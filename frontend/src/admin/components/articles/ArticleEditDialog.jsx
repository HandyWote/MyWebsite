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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import MarkdownUploadPreview from './MarkdownUploadPreview';

const SectionCard = ({ icon, title, subtitle, children, spacing = 2 }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 2, md: 3 },
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing,
      bgcolor: 'background.paper'
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

const ArticleEditDialog = ({
  open,
  loading,
  isEdit,
  article,
  onClose,
  onSave,
  onArticleChange,
  validateTags,
  fileUploading,
  onUploadCover,
  coverPreview,
  aiAnalyzing,
  aiSuggestions,
  onAiAnalyze,
  onApplySuggestions,
  previewContent,
  onPreviewContentChange,
  onMarkdownError,
  onUploadPdf,
  pdfUploading,
  pdfPreview
}) => {
  const handleFieldChange = field => e => {
    onArticleChange(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleContentTypeChange = e => {
    const newType = e.target.value;
    if (newType === 'pdf' && article.content) {
      // 提醒用户：切换类型会清空现有Markdown内容
      if (!window.confirm('切换为PDF将清空现有Markdown内容，是否继续？')) {
        return;
      }
    }
    onArticleChange(prev => ({
      ...prev,
      content_type: newType,
      // 清空对应的内容
      content: newType === 'pdf' ? '' : prev.content,
      pdf_filename: newType === 'markdown' ? '' : prev.pdf_filename
    }));
  };

  const handlePdfUpload = e => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPdf(file);
    }
  };

  const canAnalyze = article.title.trim() && (article.content_type === 'markdown' ? article.content.trim() : true);

  return (
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
          background: 'linear-gradient(180deg, rgba(25,118,210,0.04) 0%, rgba(25,118,210,0.01) 100%)'
        }}
      >
        <Stack spacing={3} sx={{ mt: 1 }}>
          <SectionCard title="内容类型" subtitle="选择文章的内容格式">
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={article.content_type || 'markdown'}
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

          <SectionCard title="基础信息" subtitle="文章标题、分类、标签与摘要">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="标题"
                  value={article.title || ''}
                  onChange={handleFieldChange('title')}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="分类"
                  value={article.category || ''}
                  onChange={handleFieldChange('category')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="标签（逗号分隔）"
                  value={article.tags || ''}
                  onChange={handleFieldChange('tags')}
                  fullWidth
                  error={!!article.tags && !validateTags(article.tags)}
                  helperText={!!article.tags && !validateTags(article.tags) ? '标签格式不合法' : ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="摘要"
                  value={article.summary || ''}
                  onChange={handleFieldChange('summary')}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title="封面与媒体" subtitle="上传封面图片，增强文章的视觉表现">
            {article.content_type === 'pdf' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  PDF 文件
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button variant="outlined" component="label" startIcon={<PictureAsPdfIcon />} disabled={pdfUploading}>
                    上传 PDF 文件
                    <input type="file" accept=".pdf" hidden onChange={handlePdfUpload} />
                  </Button>
                  {article.pdf_filename && (
                    <Typography variant="body2" color="success.main">
                      已上传: {article.pdf_filename}
                    </Typography>
                  )}
                  {pdfUploading && <Typography color="text.secondary">上传中...</Typography>}
                </Stack>
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={fileUploading}>
                上传封面
                <input type="file" accept="image/*" hidden onChange={onUploadCover} />
              </Button>
              {coverPreview && (
                <Box
                  component="img"
                  src={coverPreview}
                  alt="封面"
                  sx={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src = coverPreview;
                  }}
                />
              )}
              {fileUploading && <Typography color="text.secondary">上传中...</Typography>}
            </Stack>
          </SectionCard>

          <SectionCard
            title="AI 帮助填写"
            subtitle="根据标题与正文自动生成分类、标签和摘要"
            icon={<SmartToyIcon color="primary" sx={{ fontSize: 28 }} />}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  AI 将基于当前输入内容提出建议，您可以在右侧一键应用。
                </Typography>
              </Box>
              <Tooltip title="需要填写标题和内容才能进行AI分析">
                <span>
                  <Button
                    variant="contained"
                    startIcon={aiAnalyzing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={onAiAnalyze}
                    disabled={aiAnalyzing || !canAnalyze}
                    size="medium"
                    sx={{ minWidth: 140, fontWeight: 600 }}
                  >
                    {aiAnalyzing ? '分析中...' : '开始分析'}
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
                  borderColor: 'success.200'
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
                <Button variant="outlined" size="small" onClick={onApplySuggestions}>
                  应用建议
                </Button>
              </Alert>
            )}
          </SectionCard>

          {article.content_type === 'markdown' ? (
            <SectionCard title="正文内容" subtitle="上传 Markdown 文件并实时预览渲染效果">
              <MarkdownUploadPreview
                content={article.content || ''}
                onContentChange={value => onArticleChange(prev => ({ ...prev, content: value }))}
                previewContent={previewContent}
                onPreviewContentChange={onPreviewContentChange}
                onError={onMarkdownError}
              />
            </SectionCard>
          ) : (
            <SectionCard title="PDF 文件" subtitle="已上传的 PDF 文件">
              {article.pdf_filename ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    已上传 PDF 文件: {article.pdf_filename}
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    请上传 PDF 文件
                  </Typography>
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                PDF 文件将作为文章的主要内容显示，访客可以直接在浏览器中查看或下载。
              </Typography>
            </SectionCard>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={onSave} variant="contained" disabled={loading}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ArticleEditDialog;
