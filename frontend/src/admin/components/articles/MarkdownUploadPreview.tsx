import { useRef, useState, type ChangeEvent } from 'react';
import { Box, Chip, Stack, Typography} from '@mui/material';
import { PixelButton } from '@/components/pixel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import 'katex/dist/katex.min.css';

/** 上传/读取失败的提示通道（severity 缺省 error）。 */
export type UploadErrorReporter = (message: string, severity?: 'error' | 'warning') => void;

export interface MarkdownUploadPreviewProps {
  /** 当前正文（受控）。 */
  content: string;
  onContentChange: (value: string) => void;
  onError?: UploadErrorReporter;
  /** 选中 .md 后回调去掉后缀的文件名（用于自动填标题）。 */
  onFileNameChange?: (nameWithoutExt: string) => void;
}

const MarkdownUploadPreview = ({
  content,
  onContentChange,
  onError,
  onFileNameChange
}: MarkdownUploadPreviewProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
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

      // 提取文件名作为标题（去掉 .md 后缀）
      const nameWithoutExt = file.name.replace(/\.md$/i, '');
      setFileName(file.name);
      onFileNameChange?.(nameWithoutExt);
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
          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Markdown 文件
            </Typography>
          </Box>
          <Box>
            <PixelButton variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              选择 Markdown 文件
              <input
                key={content ? 'loaded' : 'empty'}
                ref={inputRef}
                type="file"
                accept=".md,text/markdown"
                hidden
                onChange={handleUpload}
              />
            </PixelButton>
          </Box>
        </Stack>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {content && fileName ? (
            <Chip label={fileName} onDelete={handleClear} color="primary" variant="outlined" />
          ) : (
            content && null
          )}
          {!content && (
            <Typography variant="body2" color="error.main">
              * 未选择正文文件
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MarkdownUploadPreview;
