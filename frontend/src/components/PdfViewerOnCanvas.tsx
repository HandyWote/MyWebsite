import { useState, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { getApiUrl } from '../config/api';
import { normalizeBrowserPdfUrl } from '../utils/pdfUrl';

// 配置PDF.js worker - 使用本地worker文件（ES模块版本）
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewerOnCanvas = ({ filename, url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);

  const resolvePdfUrl = useCallback(() => {
    if (url) return normalizeBrowserPdfUrl(url) || '';
    if (!filename) return '';

    const normalized = normalizeBrowserPdfUrl(filename);
    return normalized || getApiUrl.articlePdf(filename);
  }, [url, filename]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;
    const controller = new AbortController();

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setNumPages(null);
        setPdfUrl(null);

        const finalUrl = resolvePdfUrl();
        if (!finalUrl) {
          throw new Error('无法解析PDF地址');
        }
        // 注意：这里保留原生 fetch 而不是 apiClient/api.download：
        // 1) 需要 AbortSignal 支持组件卸载时取消请求；
        // 2) 返回 Blob 而非 JSON，且需区分 404 与通用错误；
        // 3) apiClient 的 JSON 解包管道不适用二进制下载。
        // 该请求不依赖后端统一响应结构，不受响应格式变更影响。
        const response = await fetch(finalUrl, {
          method: 'GET',
          signal: controller.signal,
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('PDF文件不存在');
          }
          throw new Error(`PDF文件加载失败 (状态码: ${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setPdfUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('PDF加载错误:', err);
        if (isMounted) {
          setError(`PDF加载失败(可能被第三方下载器拦截): ${err.message}`);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvePdfUrl, filename, url]);

  // PDF加载成功回调
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // PDF加载失败回调
  const onDocumentLoadError = (error) => {
    console.error('PDF文档加载失败:', error);
    setError('PDF文档加载失败，请检查文件格式');
    setLoading(false);
  };

  // 缩放控制
  const zoomIn = () => {
    setScale((prev) => Math.min(2.0, prev + 0.1));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.1));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'common.white',
        display: 'flex',
        flexDirection: 'column',
        height: 800
      }}
    >
      {/* 工具栏 */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            PDF 文件 - {filename || '文档'}
          </Typography>
          {numPages && (
            <Typography variant="body2" color="text.secondary">
              共 {numPages} 页
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 缩放控制 */}
          <Tooltip title="缩小">
            <IconButton size="small" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </Typography>

          <Tooltip title="放大">
            <IconButton size="small" onClick={zoomIn} disabled={scale >= 2.0}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* 新窗口打开 */}
          <Tooltip title="在新窗口打开">
            <IconButton
              component="a"
              size="small"
              href={pdfUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* PDF渲染区域 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'grey.300',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          p: 2
        }}
      >
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress />
            </Box>
          }
          error={
            <Alert severity="error">PDF加载失败，请检查文件是否存在或格式是否正确</Alert>
          }
        >
          {Array.from({ length: numPages }, (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, my: 2 }}>
                  <CircularProgress />
                </Box>
              }
              style={{
                marginBottom: index < numPages - 1 ? '20px' : '0'
              }}
            />
          ))}
        </Document>
      </Box>
    </Paper>
  );
};

export default PdfViewerOnCanvas;
