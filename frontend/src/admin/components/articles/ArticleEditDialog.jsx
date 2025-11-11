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
  Grid
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
  onMarkdownError
}) => {
  const handleFieldChange = field => e => {
    onArticleChange(prev => ({ ...prev, [field]: e.target.value }));
  };

  const canAnalyze = article.title.trim() && article.content.trim();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1.5 }}>
        {isEdit ? '编辑文章' : '新增文章'}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          请完整填写文章元信息，并上传 Markdown 正文以获得实时预览
        </Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          background: 'linear-gradient(180deg, rgba(25,118,210,0.04) 0%, rgba(25,118,210,0.01) 100%)'
        }}
      >
        <Stack spacing={3} sx={{ mt: 1 }}>
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

          <SectionCard title="正文内容" subtitle="上传 Markdown 文件并实时预览渲染效果">
            <MarkdownUploadPreview
              content={article.content || ''}
              onContentChange={value => onArticleChange(prev => ({ ...prev, content: value }))}
              previewContent={previewContent}
              onPreviewContentChange={onPreviewContentChange}
              onError={onMarkdownError}
            />
          </SectionCard>
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
