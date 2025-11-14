import { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 配置PDF.js worker
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfViewerOnCanvas = ({ filename, url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);

  // 验证PDF文件是否可以正常加载
  useEffect(() => {
    const validatePdfUrl = async () => {
      try {
        if (!filename && !url) {
          throw new Error('PDF文件名不能为空');
        }

        const finalUrl = url || `/api/articles/pdf/${filename}`;

        // 使用HEAD请求验证PDF文件是否存在且可访问
        const response = await fetch(finalUrl, {
          method: 'HEAD',
          mode: 'cors'
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('PDF文件不存在');
          }
          throw new Error(`PDF文件加载失败 (状态码: ${response.status})`);
        }

        // 检查内容类型是否为PDF
        const contentType = response.headers.get('Content-Type');
        if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
          console.warn('警告：响应的内容类型可能不是PDF:', contentType);
        }

        setPdfUrl(finalUrl);
        setLoading(false);
      } catch (err) {
        console.error('PDF加载错误:', err);
        setError(`PDF加载失败: ${err.message}`);
        setLoading(false);
      }
    };

    // 添加短暂延迟，避免闪屏
    const timer = setTimeout(() => {
      validatePdfUrl();
    }, 300);

    return () => clearTimeout(timer);
  }, [filename, url]);

  // PDF加载成功回调
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // PDF加载失败回调
  const onDocumentLoadError = (error) => {
    console.error('PDF文档加载失败:', error);
    setError('PDF文档加载失败，请检查文件格式');
    setLoading(false);
  };

  // 导航控制
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const goToFirstPage = () => {
    setPageNumber(1);
  };

  const goToLastPage = () => {
    setPageNumber(numPages);
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
      window.open(pdfUrl, '_blank');
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
              第 {pageNumber} / {numPages} 页
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

          {/* 分页控制 */}
          {numPages > 1 && (
            <>
              <Tooltip title="第一页">
                <IconButton size="small" onClick={goToFirstPage} disabled={pageNumber === 1}>
                  <FirstPageIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="上一页">
                <IconButton size="small" onClick={goToPrevPage} disabled={pageNumber === 1}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="下一页">
                <IconButton
                  size="small"
                  onClick={goToNextPage}
                  disabled={pageNumber === numPages}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="最后一页">
                <IconButton
                  size="small"
                  onClick={goToLastPage}
                  disabled={pageNumber === numPages}
                >
                  <LastPageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}

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
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
              </Box>
            }
          />
        </Document>
      </Box>
    </Paper>
  );
};

export default PdfViewerOnCanvas;
