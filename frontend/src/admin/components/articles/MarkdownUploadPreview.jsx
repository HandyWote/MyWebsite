import React, { useRef, useState, useEffect } from 'react';
import { Box, Button, Chip, Stack, Typography, Paper, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

class MarkdownPreviewBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || '未知错误' };
  }

  componentDidCatch(error) {
    console.error('Markdown预览渲染失败:', error);
    this.props.onError?.(`Markdown预览失败：${error.message || '未知错误'}`, 'error');
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ mb: 1 }}>
          Markdown 预览失败：{this.state.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}

const MarkdownUploadPreview = ({
  content,
  onContentChange,
  previewContent,
  onPreviewContentChange,
  onError
}) => {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!content) {
      setFileName('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [content]);

  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.md')) {
      onError?.('请上传 .md 文件', 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const text = typeof event.target?.result === 'string' ? event.target.result : '';
      onContentChange(text);
      onPreviewContentChange(text);
      setFileName(file.name);
    };
    reader.onerror = () => {
      onError?.('读取Markdown文件失败，请重试', 'error');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleClear = () => {
    onContentChange('');
    onPreviewContentChange('');
    setFileName('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          p: 2,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Markdown 文件
            </Typography>
            <Typography variant="body2" color="text.secondary">
              上传 .md 文件自动填充正文内容，不再支持在线编辑。如需更新请重新上传。
            </Typography>
          </Box>
          <Box>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              选择 Markdown 文件
              <input
                ref={inputRef}
                type="file"
                accept=".md,text/markdown"
                hidden
                onChange={handleUpload}
              />
            </Button>
          </Box>
        </Stack>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {fileName ? (
            <Chip label={fileName} onDelete={handleClear} color="primary" variant="outlined" />
          ) : (
            content && (
              <Typography variant="body2" color="text.secondary">
                已加载数据库中的正文内容，如需替换请上传新的 Markdown 文件。
              </Typography>
            )
          )}
          {!content && (
            <Typography variant="body2" color="error.main">
              * 未选择正文文件
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Markdown 渲染预览：
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minHeight: 120,
            bgcolor: '#fafafa',
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              marginTop: 1,
              marginBottom: 1
            },
            '& p': {
              marginBottom: 1
            },
            '& ul, & ol': {
              marginBottom: 1,
              paddingLeft: 2
            }
          }}
        >
          <MarkdownPreviewBoundary key={previewContent} onError={onError}>
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
              {previewContent || '在上方上传 Markdown 文件后，这里将展示渲染效果...'}
            </ReactMarkdown>
          </MarkdownPreviewBoundary>
        </Paper>
      </Box>
    </Box>
  );
};

export default MarkdownUploadPreview;
