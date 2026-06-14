import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
  Snackbar,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getApiUrl, api } from '../../config/api';
import { colors, typography } from '../../components/pixel/tokens';

export default function DataImportExport() {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingFile = useRef(null);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 导出数据
  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await api.get(getApiUrl.adminExport());
      // 创建并下载文件
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `handywrite_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('数据导出成功');
    } catch (error) {
      showSnackbar('数据导出失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 文件选择时：先存文件，弹出确认
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      showSnackbar('请选择JSON格式的文件', 'error');
      event.target.value = '';
      return;
    }

    pendingFile.current = file;
    setConfirmOpen(true);
  };

  // 确认后执行导入
  const handleConfirmImport = async () => {
    setConfirmOpen(false);
    const file = pendingFile.current;
    if (!file) return;

    setLoading(true);
    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
      const jsonData = JSON.parse(text);

      await api.post(getApiUrl.adminImport(), jsonData);
      showSnackbar('数据导入成功');
    } catch (error) {
      showSnackbar('数据导入失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
      pendingFile.current = null;
      // 重置文件输入
      document.getElementById('import-input').value = '';
    }
  };

  // 取消导入
  const handleCancelImport = () => {
    setConfirmOpen(false);
    pendingFile.current = null;
    document.getElementById('import-input').value = '';
  };

  const triggerFileInput = () => {
    document.getElementById('import-input').click();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>数据导入导出</Typography>

      <Stack spacing={3}>
        {/* 导出卡片 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <CloudDownloadIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              数据导出
            </Typography>
            <Typography variant="body2" color="text.secondary">
              导出所有网站数据（包括技能、联系方式、文章、站点内容等）为JSON格式文件，可用于备份或迁移。
            </Typography>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            <Button
              variant="contained"
              onClick={handleExport}
              disabled={loading}
              startIcon={<CloudDownloadIcon />}
            >
              导出数据
            </Button>
          </CardActions>
        </Card>

        {/* 导入卡片 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <CloudUploadIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              数据导入
            </Typography>
            <Typography variant="body2" color="text.secondary">
              从JSON文件导入数据，可用于恢复备份或迁移数据。注意：导入操作会覆盖现有同名数据。
            </Typography>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            <input
              id="import-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              onClick={triggerFileInput}
              disabled={loading}
              startIcon={<CloudUploadIcon />}
            >
              选择文件导入
            </Button>
          </CardActions>
        </Card>

        {/* 注意事项 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>注意事项</Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>导出的文件包含所有网站数据，建议定期备份</li>
              <li>导入操作会覆盖现有同名数据，请谨慎操作</li>
              <li>请确保导入的JSON文件格式正确</li>
              <li>导入大量数据时可能需要较长时间，请耐心等待</li>
              <li>回收站中的数据不会被导出</li>
            </ul>
          </Typography>
        </Paper>
      </Stack>

      {/* 导入确认对话框 */}
      <Dialog open={confirmOpen} onClose={handleCancelImport}>
        <DialogTitle sx={{ fontFamily: typography.fontFamily.mono, color: colors.text.primary }}>
          确认导入数据
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.text.secondary }}>
            导入将覆盖现有数据，确定要继续吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport}>取消</Button>
          <Button onClick={handleConfirmImport} variant="contained" disabled={loading}>
            确认导入
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示信息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
