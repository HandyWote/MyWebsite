import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Stack,
  Button,
  Typography
} from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const AiSettingsDialog = ({
  open,
  loading,
  saving,
  testing,
  settings,
  onClose,
  onChange,
  onSave,
  onTest
}) => {
  const handleFieldChange = field => e => {
    onChange(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsSuggestIcon fontSize="small" />
        AI 服务设置
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          前端仅负责提交请求，实际调用模型的代理由后端完成。请在此配置提示词、模型、Base URL 与 API Key。
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="提示词"
              placeholder="用于引导模型生成建议"
              value={settings.prompt || ''}
              onChange={handleFieldChange('prompt')}
              fullWidth
              multiline
              minRows={3}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="模型"
              placeholder="如 gpt-4o-mini"
              value={settings.model || ''}
              onChange={handleFieldChange('model')}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Base URL"
              placeholder="https://api.openai.com/v1"
              value={settings.base_url || ''}
              onChange={handleFieldChange('base_url')}
              fullWidth
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="API Key"
              type="password"
              placeholder="sk-xxxx"
              value={settings.api_key || ''}
              onChange={handleFieldChange('api_key')}
              fullWidth
              disabled={loading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={onTest}
            disabled={testing || loading}
          >
            {testing ? '测试中...' : '测试连接'}
          </Button>
        </Stack>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AiSettingsDialog;
