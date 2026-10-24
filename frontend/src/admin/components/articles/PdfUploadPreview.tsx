import { useRef, useState, type ChangeEvent } from 'react';
import {
  Box,
  Stack,
  Typography,
  Chip,
  Alert,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { PixelButton } from '@/components/pixel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { API_ENDPOINTS } from '../../../api/endpoints';
import PdfViewerOnCanvas from '../../../components/PdfViewerOnCanvas';
import { normalizeBrowserPdfUrl } from '../../../utils/pdfUrl';

export interface PdfUploadPreviewProps {
  /** 已上传的 PDF 文件名（空表示未上传）。 */
  filename?: string;
  /** 选好 .pdf 后交给容器上传。 */
  onUpload?: (file: File) => void;
  uploading?: boolean;
  onClear?: () => void;
  errorMessage?: string;
}

const PdfUploadPreview = ({
  filename,
  onUpload,
  uploading = false,
  onClear,
  errorMessage
}: PdfUploadPreviewProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');
  const pdfUrl = filename ? API_ENDPOINTS.PUBLIC.ARTICLE_PDF(filename) : '';
  const safePdfUrl = normalizeBrowserPdfUrl(pdfUrl);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
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
            <PixelButton
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
            </PixelButton>
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

          {filename && safePdfUrl && (
            <Tooltip title="在新窗口打开">
              <IconButton
                component="a"
                size="small"
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
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
            上传 PDF 文件后，可在此预览渲染效果。
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PdfUploadPreview;
