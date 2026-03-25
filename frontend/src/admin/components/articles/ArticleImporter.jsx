// frontend/src/admin/components/articles/ArticleImporter.jsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Upload } from '@mui/icons-material';

/**
 * 文章批量导入对话框
 * 纯渲染组件：接收 props 进行渲染，管理局部状态，调用父组件回调
 */
export default function ArticleImporter({ open, onImport, onClose }) {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setResults(null);
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    try {
      const result = await onImport(files);
      setResults(result);
    } catch (err) {
      setResults({ error: err.message });
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>批量导入文章</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
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
          </Button>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>关闭</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={files.length === 0 || importing}
        >
          导入
        </Button>
      </DialogActions>
    </Dialog>
  );
}
