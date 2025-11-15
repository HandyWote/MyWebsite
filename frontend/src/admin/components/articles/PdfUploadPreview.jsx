import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Alert,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getApiUrl } from '../../../config/api';
import PdfViewerOnCanvas from '../../../components/PdfViewerOnCanvas';

const PdfUploadPreview = ({
  filename,
  onUpload,
  uploading = false,
  onClear,
  errorMessage
}) => {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const pdfUrl = filename ? getApiUrl.articlePdf(filename) : '';

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('仅支持上传 .pdf 文件');
      event.target.value = '';
      return;
    }

    setLocalError('');
    onUpload?.(file);
    event.target.value = '';
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setLocalError('');
    onClear?.();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
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
              PDF 文件
            </Typography>
            <Typography variant="body2" color="text.secondary">
              上传 PDF 文档作为文章内容，支持访客在线预览或另存为。
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={uploading}
            >
              选择 PDF 文件
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                hidden
                onChange={handleFileChange}
              />
            </Button>
          </Box>
        </Stack>

        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {filename ? (
            <Chip
              icon={<PictureAsPdfIcon color="error" />}
              label={filename}
              onDelete={onClear ? handleClear : undefined}
              deleteIcon={onClear ? <DeleteIcon /> : undefined}
              color="primary"
              variant="outlined"
            />
          ) : (
            <Typography variant="body2" color="error.main">
              * 暂未上传 PDF 文件
            </Typography>
          )}

          {uploading && (
            <Typography variant="body2" color="text.secondary">
              上传中...
            </Typography>
          )}

          {filename && pdfUrl && (
            <Tooltip title="在新窗口打开">
              <IconButton size="small" onClick={() => window.open(pdfUrl, '_blank')}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {(localError || errorMessage) && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {localError || errorMessage}
          </Alert>
        )}
      </Paper>

      {filename ? (
        <PdfViewerOnCanvas filename={filename} url={pdfUrl} />
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            textAlign: 'center',
            color: 'text.secondary',
            borderStyle: 'dashed'
          }}
        >
          <Typography variant="body2">
            上传 PDF 文件后，可在此处预览渲染效果。
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PdfUploadPreview;
