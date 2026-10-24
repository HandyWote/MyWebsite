import { useState, useRef, type ChangeEvent } from 'react';
import {
  Typography,
  Container,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { PixelButton, PixelConfirmDialog } from '@/components/pixel';
import { exportApi } from '@/api/exportApi';
import type { ExportDataSet } from '@/api/types';
import useNotification from '../../hooks/useNotification';

/** 隐藏的导入文件输入框（id 与下面 JSX 中的 `<input>` 一致）。 */
const importInputElement = (): HTMLInputElement | null => {
  const element = document.getElementById('import-input');
  return element instanceof HTMLInputElement ? element : null;
};

export default function DataImportExport() {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingFile = useRef<File | null>(null);

  const notify = useNotification();

  // 导出数据
  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportApi.exportData();
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
      notify.success('数据导出成功');
    } catch {
      notify.error('数据导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 文件选择时：先存文件，弹出确认
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      notify.error('请选择JSON格式的文件');
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
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
      // 备份文件是后端导出数据的原样回灌，形状即 ExportDataSet。
      const jsonData = JSON.parse(text) as ExportDataSet;

      await exportApi.importData(jsonData);
      notify.success('数据导入成功');
    } catch (error) {
      notify.error('数据导入失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
      pendingFile.current = null;
      // 重置文件输入
      const input = importInputElement();
      if (input) input.value = '';
    }
  };

  // 取消导入
  const handleCancelImport = () => {
    setConfirmOpen(false);
    pendingFile.current = null;
    const input = importInputElement();
    if (input) input.value = '';
  };

  const triggerFileInput = () => {
    importInputElement()?.click();
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
            <PixelButton
              variant="primary"
              onClick={handleExport}
              disabled={loading}
              startIcon={<CloudDownloadIcon />}
            >
              导出数据
            </PixelButton>
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
            <PixelButton
              variant="primary"
              onClick={triggerFileInput}
              disabled={loading}
              startIcon={<CloudUploadIcon />}
            >
              选择文件导入
            </PixelButton>
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

      {/* 导入确认对话框：PixelConfirmDialog 的 onConfirm 随后会自动调 onClose，
          与原 ConfirmDialog 行为一致；确认按需在 loading 时置灰。 */}
      <PixelConfirmDialog
        open={confirmOpen}
        title="确认导入数据"
        message="导入将覆盖现有数据，确定要继续吗？"
        confirmText="确认导入"
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        confirmButtonProps={{ disabled: loading }}
      />
    </Container>
  );
}
