import { useState, useEffect } from 'react';
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
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getApiUrl } from '../config/api';

// 配置PDF.js worker - 使用本地worker文件（ES模块版本）
import { pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PdfViewerOnCanvas = ({ filename, url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);

  const resolvePdfUrl = () => {
    if (url) {
      return url;
    }
    if (!filename) return '';
    if (/^https?:\/\//.test(filename)) {
      return filename;
    }
    if (filename.startsWith('/api/')) {
      const base = getApiUrl.websocket();
      const normalizedBase = base && base.endsWith('/') ? base.slice(0, -1) : base;
      return `${normalizedBase || ''}${filename}`;
    }
    return getApiUrl.articlePdf(filename);
  };

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
        setSourceUrl(finalUrl);

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
  }, [filename, url]);

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

  // 在新窗口打开PDF
  const openInNewWindow = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener');
    } else if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener');
    }
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
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        height: 800
      }}
    >
      {/* 工具栏 */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #ddd',
          backgroundColor: 'white',
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
            <IconButton size="small" onClick={openInNewWindow}>
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
          backgroundColor: '#e0e0e0',
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
          {Array.from(new Array(numPages), (el, index) => (
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
