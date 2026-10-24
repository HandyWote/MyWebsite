// frontend/src/admin/components/articles/ArticleImporter.tsx
import { useState, type ChangeEvent } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Upload } from '@mui/icons-material';
import { PixelButton, PixelDialog } from '@/components/pixel';

/** 导入结果：成功统计，或失败文案（两态共用一次渲染）。 */
export interface ArticleImportResult {
  success?: number;
  failed?: number;
  error?: string;
}

export interface ArticleImporterProps {
  open: boolean;
  /** 交给容器批量导入；resolve 出统计或错误文案。 */
  onImport: (files: File[]) => Promise<ArticleImportResult>;
  onClose: () => void;
}

/**
 * 文章批量导入对话框
 * 纯渲染组件：接收 props 进行渲染，管理局部状态，调用父组件回调
 */
export default function ArticleImporter({ open, onImport, onClose }: ArticleImporterProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ArticleImportResult | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    setFiles(selected ? Array.from(selected) : []);
    setResults(null);
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    try {
      const result = await onImport(files);
      setResults(result);
    } catch (err) {
      setResults({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResults(null);
    onClose();
  };

  return (
    <PixelDialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      title="批量导入文章"
      actions={(
        <>
          <PixelButton variant="text" onClick={handleClose}>
            关闭
          </PixelButton>
          <PixelButton
            variant="contained"
            onClick={handleImport}
            disabled={files.length === 0 || importing}
          >
            导入
          </PixelButton>
        </>
      )}
    >
      <Box sx={{ mb: 2 }}>
        <PixelButton
          variant="outlined"
          component="label"
          startIcon={<Upload />}
        >
          选择文件
          <input
            type="file"
            hidden
            multiple
            accept=".md,.markdown,.txt,.pdf"
            onChange={handleFileChange}
            aria-label="选择文件"
          />
        </PixelButton>
      </Box>

      {files.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            已选择 {files.length} 个文件：
          </Typography>
          <List dense>
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText primary={file.name} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {importing && <LinearProgress />}

      {results && (
        <Box sx={{ mt: 2 }}>
          {results.error ? (
            <Typography color="error">{results.error}</Typography>
          ) : (
            <Typography color="success.main">
              导入成功：{results.success} 篇，失败：{results.failed} 篇
            </Typography>
          )}
        </Box>
      )}
    </PixelDialog>
  );
}
