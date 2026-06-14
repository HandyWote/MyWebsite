import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Stack,
  Button,
  Typography,
} from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import useAiStore from '@/stores/aiStore';
import useNotification from '../../../hooks/useNotification';

/**
 * AiSettingsDialog - AI 服务设置对话框
 * 直接从 aiStore 读取状态和操作，仅需 open/onClose 两个 props。
 */
export default function AiSettingsDialog({ open, onClose }) {
  const {
    aiSettings: storeSettings,
    settingsLoading,
    settingsSaving,
    settingsTesting,
    fetchAiSettings,
    updateAiSettings,
    testAiConnection,
  } = useAiStore();

  const notify = useNotification();

  // 本地表单状态
  const [form, setForm] = useState({});

  // 打开时从 store 同步设置（仅依赖 open，避免 store 函数变更触发重复请求）
  useEffect(() => {
    if (open) {
      // 先获取最新设置，再同步到本地表单
      fetchAiSettings().then((settings) => {
        if (settings) setForm(settings);
      }).catch(() => {
        // fetchAiSettings 失败时使用 store 中已有的值
        if (storeSettings) setForm(storeSettings);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      await updateAiSettings(form);
      notify.notify().success('AI 设置保存成功');
      onClose?.();
    } catch (err) {
      notify.notify().error(err.message);
    }
  };

  const handleTest = async () => {
    try {
      await testAiConnection(form);
      notify.notify().success('AI 连接测试成功');
    } catch (err) {
      notify.notify().error(err.message);
    }
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
              value={form.prompt || ''}
              onChange={handleFieldChange('prompt')}
              fullWidth
              multiline
              minRows={3}
              disabled={settingsLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="模型"
              placeholder="如 gpt-4o-mini"
              value={form.model || ''}
              onChange={handleFieldChange('model')}
              fullWidth
              disabled={settingsLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Base URL"
              placeholder="https://api.openai.com/v1"
              value={form.base_url || ''}
              onChange={handleFieldChange('base_url')}
              fullWidth
              disabled={settingsLoading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="API Key"
              type="password"
              placeholder={form.api_key_masked || 'sk-xxxx'}
              value={form.api_key || ''}
              onChange={handleFieldChange('api_key')}
              fullWidth
              disabled={settingsLoading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={handleTest}
            disabled={settingsTesting || settingsLoading}
          >
            {settingsTesting ? '测试中...' : '测试连接'}
          </Button>
        </Stack>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={settingsSaving}>
          {settingsSaving ? '保存中...' : '保存设置'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
