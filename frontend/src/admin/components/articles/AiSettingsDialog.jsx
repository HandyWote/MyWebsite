import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Button,
  Typography,
} from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import useAiStore from '@/stores/aiStore';
import useNotification from '../../../hooks/useNotification';
import {
  AdminFieldGrid,
  AdminFieldGridItem,
  AdminTextField,
} from '../ui';

/**
 * AiSettingsDialog - AI 服务设置对话框
 * 直接从 aiStore 读取状态和操作，仅需 open/onClose 两个 props。
 */
export default function AiSettingsDialog({ open, onClose }) {
  const {
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

  const openedRef = useRef(false);
  const requestIdRef = useRef(0);

  // Fetch exactly once for each closed -> open transition. Store updates must not overwrite edits.
  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      requestIdRef.current += 1;
      return;
    }
    if (openedRef.current) return;

    openedRef.current = true;
    const requestId = ++requestIdRef.current;
    fetchAiSettings()
      .then((settings) => {
        if (requestId === requestIdRef.current && settings) setForm(settings);
      })
      .catch(() => {
        const settings = useAiStore.getState().aiSettings;
        if (requestId === requestIdRef.current && settings) setForm(settings);
      });
  }, [fetchAiSettings, open]);

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
        <AdminFieldGrid>
          <AdminFieldGridItem>
            <AdminTextField
              label="提示词"
              placeholder="用于引导模型生成建议"
              value={form.prompt || ''}
              onChange={handleFieldChange('prompt')}
              multiline
              minRows={3}
              disabled={settingsLoading}
            />
          </AdminFieldGridItem>
          <AdminFieldGridItem size={{ xs: 12, sm: 6 }}>
            <AdminTextField
              label="模型"
              placeholder="如 gpt-4o-mini"
              value={form.model || ''}
              onChange={handleFieldChange('model')}
              disabled={settingsLoading}
            />
          </AdminFieldGridItem>
          <AdminFieldGridItem size={{ xs: 12, sm: 6 }}>
            <AdminTextField
              label="Base URL"
              placeholder="https://api.openai.com/v1"
              value={form.base_url || ''}
              onChange={handleFieldChange('base_url')}
              disabled={settingsLoading}
            />
          </AdminFieldGridItem>
          <AdminFieldGridItem>
            <AdminTextField
              label="API Key"
              type="password"
              placeholder={form.api_key_masked || 'sk-xxxx'}
              value={form.api_key || ''}
              onChange={handleFieldChange('api_key')}
              disabled={settingsLoading}
            />
          </AdminFieldGridItem>
        </AdminFieldGrid>
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
