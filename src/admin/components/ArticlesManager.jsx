import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Checkbox, IconButton, Typography, Chip,
  Alert, CircularProgress, Tooltip, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeMermaid from 'rehype-mermaid';
import xss from 'xss';
import Snackbar from '@mui/material/Snackbar';
import 'katex/dist/katex.min.css';

const API_PATH = 'http://localhost:5000/api/admin/articles';
const UPLOAD_API = 'http://localhost:5000/api/admin/articles/cover'; // 文章封面上传接口

function parseMarkdown(md) {
  // 简单提取标题和正文
  const lines = md.split('\n');
  let title = '';
  let content = md;
  for (let l of lines) {
    if (l.startsWith('# ')) {
      title = l.replace(/^# /, '').trim();
      content = lines.slice(1).join('\n').trim();
      break;
    }
  }
  return { title, content };
}

const defaultArticle = {
  title: '',
  category: '',
  tags: '',
  summary: '',
  content: '',
  cover: '',
};

const DEFAULT_COVER = '/default-cover.svg'; 

const ArticlesManager = () => {
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editArticle, setEditArticle] = useState(defaultArticle);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [fileUploading, setFileUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewContent, setPreviewContent] = useState('');

  // AI分析相关状态
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [importProgress, setImportProgress] = useState({ total: 0, success: 0, fail: 0, failFiles: [] });
  
  // 批量AI分析相关状态
  const [batchAiAnalyzing, setBatchAiAnalyzing] = useState(false);
  const [batchAiProgress, setBatchAiProgress] = useState({ current: 0, total: 0, success: 0, fail: 0, failedArticles: [] });
  const [batchAiCancelled, setBatchAiCancelled] = useState(false);

  // 拉取文章
  const fetchArticles = async (params = {}) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_PATH}?page=${params.page ?? page + 1}&per_page=${params.perPage ?? rowsPerPage}&search=${params.search ?? search}`,
      { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setArticles(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => { fetchArticles({ page: 1 }); }, []);

  // 分页、搜索
  const handleChangePage = (e, newPage) => { setPage(newPage); fetchArticles({ page: newPage + 1 }); };
  const handleChangeRowsPerPage = e => { setRowsPerPage(+e.target.value); setPage(0); fetchArticles({ page: 1, perPage: +e.target.value }); };
  // 搜索后自动跳转到第一页
  const handleSearch = () => { setPage(0); fetchArticles({ page: 1, search }); };

  // 选择
  const handleSelectAll = e => setSelected(e.target.checked ? articles.map(a => a.id) : []);
  const handleSelect = id => setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);

  // 新增/编辑弹窗
  const openEdit = async (article = defaultArticle, id = null) => {
    if (id) {
      // 拉取详情
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/articles/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEditArticle({
        ...article,
        ...data,
      });
      setPreviewContent(data.content || '');
    } else {
      setEditArticle(article);
      setPreviewContent(article.content || '');
    }
    setEditId(id);
    setOpenDialog(true);
  };
  const closeEdit = () => {
    setOpenDialog(false);
    setEditArticle(defaultArticle);
    setEditId(null);
    setAiSuggestions(null); // 清除AI建议
    setPreviewContent('');
  };

  // 标签格式校验
  const validateTags = tags => /^[\u4e00-\u9fa5a-zA-Z0-9_,\-\s]+$/.test(tags);

  // AI智能分析文章内容
  const handleAiAnalyze = async () => {
    if (!editArticle.title.trim() || !editArticle.content.trim()) {
      setSnackbar({ open: true, message: '请先填写标题和内容', severity: 'warning' });
      return;
    }

    setAiAnalyzing(true);
    try {
      const token = localStorage.getItem('token');
      console.log('开始AI分析请求...');

      const response = await fetch('http://localhost:5000/api/admin/articles/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editArticle.title,
          content: editArticle.content,
          summary: editArticle.summary
        })
      });

      console.log('AI分析响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI分析响应错误:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('AI分析结果:', result);

      if (result.code === 0) {
        setAiSuggestions(result.data);
        setSnackbar({ open: true, message: 'AI分析完成！请查看建议', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: result.msg || 'AI分析失败', severity: 'error' });
      }
    } catch (error) {
      console.error('AI分析错误:', error);
      let errorMessage = '网络错误，请稍后重试';

      if (error.message.includes('CORS')) {
        errorMessage = 'CORS错误：请检查后端服务配置';
      } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误：请检查AI服务配置';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '无法连接到服务器：请检查后端服务是否运行';
      }

      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // 应用AI建议
  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;

    setEditArticle(prev => ({
      ...prev,
      category: aiSuggestions.category || prev.category,
      tags: aiSuggestions.tags ? aiSuggestions.tags.join(',') : prev.tags,
      summary: aiSuggestions.suggested_summary || prev.summary
    }));

    setSnackbar({ open: true, message: 'AI建议已应用', severity: 'success' });
  };

  // 保存
  const handleSave = async () => {
    if (!editArticle.title || !editArticle.content) return setSnackbar({ open: true, message: '标题和正文必填', severity: 'error' });
    if (editArticle.tags && !validateTags(editArticle.tags)) return setSnackbar({ open: true, message: '标签格式不合法，只能包含中英文、数字、逗号、下划线、短横线', severity: 'error' });
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_PATH}/${editId}` : API_PATH;
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editArticle)
      });
      closeEdit();
      fetchArticles({ page: page + 1 });
      setSnackbar({ open: true, message: '保存成功', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: '保存失败', severity: 'error' });
    }
    setLoading(false);
  };

  // 删除
  const handleDelete = async (ids) => {
    if (!window.confirm('确定要删除选中的文章吗？')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const idArr = Array.isArray(ids) ? ids : [ids];
      if (idArr.length > 1) {
        await fetch('http://localhost:5000/api/admin/articles/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ids: idArr })
        });
      } else {
        await fetch(`${API_PATH}/${idArr[0]}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      }
      setSelected([]);
      fetchArticles({ page: page + 1 });
      setSnackbar({ open: true, message: '删除成功', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: '删除失败', severity: 'error' });
    }
    setLoading(false);
  };

  // 上传封面
  const handleUploadCover = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(UPLOAD_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    setEditArticle(a => ({ ...a, cover: data.url }));
    setFileUploading(false);
  };

  // 批量导入md
  const handleBatchImport = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLoading(true);
    setImportProgress({ total: files.length, success: 0, fail: 0, failFiles: [] });
    const token = localStorage.getItem('token');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const res = await fetch('http://localhost:5000/api/admin/articles/import-md', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.code === 0) {
        setSnackbar({ open: true, message: data.msg, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.msg || '导入失败', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: '导入失败', severity: 'error' });
    }
    setLoading(false);
    fetchArticles({ page: 1 });
  };

  // 更新预览内容
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewContent(editArticle.content || '');
    }, 300);
    return () => clearTimeout(timer);
  }, [editArticle.content]);

  // 封面图片显示适配
  const getCoverUrl = cover => {
    if (!cover) return DEFAULT_COVER;
    if (/^https?:\/\//.test(cover)) return cover;
    return `http://localhost:5000${cover}`;
  };

  // 批量AI分析功能
  const handleBatchAiAnalyze = async () => {
    if (!selected.length) return;
    
    setBatchAiAnalyzing(true);
    setBatchAiCancelled(false);
    setBatchAiProgress({ current: 0, total: selected.length, success: 0, fail: 0, failedArticles: [] });
    
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;
    const failedArticles = [];
    
    try {
      for (let i = 0; i < selected.length; i++) {
        if (batchAiCancelled) break;
        
        const articleId = selected[i];
        setBatchAiProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          // 获取文章详情
          const articleRes = await fetch(`http://localhost:5000/api/admin/articles/${articleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const articleData = await articleRes.json();
          
          if (!articleData.title || !articleData.content) {
            failCount++;
            failedArticles.push({ id: articleId, title: articleData.title || '未知标题', error: '标题或内容为空' });
            continue;
          }
          
          // AI分析
          const aiRes = await fetch('http://localhost:5000/api/admin/articles/ai-analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: articleData.title,
              content: articleData.content,
              summary: articleData.summary
            })
          });
          
          if (!aiRes.ok) {
            throw new Error(`HTTP ${aiRes.status}`);
          }
          
          const aiResult = await aiRes.json();
          
          if (aiResult.code === 0) {
            // 应用AI建议并更新文章
            const updateData = {
              ...articleData,
              category: aiResult.data.category || articleData.category,
              tags: aiResult.data.tags ? aiResult.data.tags.join(',') : articleData.tags,
              summary: aiResult.data.suggested_summary || articleData.summary
            };
            
            const updateRes = await fetch(`http://localhost:5000/api/admin/articles/${articleId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(updateData)
            });
            
            if (updateRes.ok) {
              successCount++;
            } else {
              throw new Error('更新文章失败');
            }
          } else {
            throw new Error(aiResult.msg || 'AI分析失败');
          }
          
        } catch (error) {
          failCount++;
          failedArticles.push({ 
            id: articleId, 
            title: `文章ID: ${articleId}`, 
            error: error.message 
          });
        }
        
        setBatchAiProgress(prev => ({ 
          ...prev, 
          success: successCount, 
          fail: failCount, 
          failedArticles 
        }));
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 完成后刷新列表和清空选择
      await fetchArticles({ page: page + 1 });
      setSelected([]);
      
      const message = batchAiCancelled 
        ? `批量分析已取消。成功: ${successCount}篇，失败: ${failCount}篇`
        : `批量分析完成！成功: ${successCount}篇，失败: ${failCount}篇`;
      
      setSnackbar({ 
        open: true, 
        message, 
        severity: failCount > 0 ? 'warning' : 'success' 
      });
      
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `批量分析出错: ${error.message}`, 
        severity: 'error' 
      });
    } finally {
      setBatchAiAnalyzing(false);
      setBatchAiCancelled(false);
    }
  };
  
  // 取消批量AI分析
  const handleCancelBatchAi = () => {
    setBatchAiCancelled(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEdit()}>新增文章</Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={!selected.length} onClick={() => handleDelete(selected)}>批量删除</Button>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={batchAiAnalyzing ? <CircularProgress size={16} /> : <AutoAwesomeIcon />} 
          disabled={!selected.length || batchAiAnalyzing} 
          onClick={handleBatchAiAnalyze}
        >
          {batchAiAnalyzing ? '分析中...' : '批量AI分析'}
        </Button>
        <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>批量导入MD
          <input type="file" accept=".md" multiple hidden onChange={handleBatchImport} />
        </Button>
        <TextField size="small" placeholder="搜索标题" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ width: 200 }} />
        <Button variant="outlined" onClick={handleSearch}>搜索</Button>
      </Stack>
      {/* 批量AI分析进度显示 */}
      {batchAiAnalyzing && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleCancelBatchAi}>
              取消
            </Button>
          }
        >
          <Box>
            <Typography variant="body2" gutterBottom>
              正在进行批量AI分析：{batchAiProgress.current}/{batchAiProgress.total} 篇文章
            </Typography>
            <Typography variant="body2" color="text.secondary">
              成功: {batchAiProgress.success}篇，失败: {batchAiProgress.fail}篇
            </Typography>
            {batchAiProgress.failedArticles.length > 0 && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                失败文章: {batchAiProgress.failedArticles.map(item => item.title).join(', ')}
              </Typography>
            )}
          </Box>
        </Alert>
      )}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.length === articles.length && articles.length > 0} indeterminate={selected.length > 0 && selected.length < articles.length} onChange={handleSelectAll} />
              </TableCell>
              <TableCell>标题</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>摘要</TableCell>
              <TableCell>封面</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>更新时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles.map(row => (
              <TableRow key={row.id} selected={selected.includes(row.id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selected.includes(row.id)} onChange={() => handleSelect(row.id)} />
                </TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.tags}</TableCell>
                <TableCell>{row.summary}</TableCell>
                <TableCell>
                  <img
                    src={getCoverUrl(row.cover)}
                    alt="封面"
                    style={{ width: 48, height: 32, objectFit: 'cover' }}
                    onError={e => { e.target.onerror = null; e.target.src = DEFAULT_COVER; }}
                  />
                </TableCell>
                <TableCell>{row.created_at}</TableCell>
                <TableCell>{row.updated_at}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(row, row.id)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页行数"
      />
      {/* 新增/编辑弹窗 */}
      <Dialog open={openDialog} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogContent 
          dividers
          sx={{
            height: '80vh',
            overflowY: 'auto',
            px: 2, // 左右内边距增加到 48px
            py: 2  // 上下内边距保持 32px
          }}
        ></DialogContent>
          <Stack spacing={3}>
            <TextField 
              label="标题" 
              value={editArticle.title || ''} 
              onChange={e => setEditArticle(a => ({ ...a, title: e.target.value }))} 
              fullWidth 
              required 
            />
            
            <TextField 
              label="分类" 
              value={editArticle.category || ''} 
              onChange={e => setEditArticle(a => ({ ...a, category: e.target.value }))} 
              fullWidth 
            />
            
            <TextField 
              label="标签（逗号分隔）" 
              value={editArticle.tags || ''} 
              onChange={e => setEditArticle(a => ({ ...a, tags: e.target.value }))} 
              fullWidth 
              error={!!editArticle.tags && !validateTags(editArticle.tags)} 
              helperText={!!editArticle.tags && !validateTags(editArticle.tags) ? '标签格式不合法' : ''} 
            />
            
            <TextField 
              label="摘要" 
              value={editArticle.summary || ''} 
              onChange={e => setEditArticle(a => ({ ...a, summary: e.target.value }))} 
              fullWidth 
              multiline 
              minRows={2} 
            />

            {/* 上传封面区域 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<UploadFileIcon />} 
                disabled={fileUploading}
              >
                上传封面
                <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
              </Button>
              {editArticle.cover && (
                <img 
                  src={getCoverUrl(editArticle.cover)} 
                  alt="封面" 
                  style={{ width: 64, height: 40, objectFit: 'cover' }} 
                  onError={e => { e.target.onerror = null; e.target.src = DEFAULT_COVER; }} 
                />
              )}
              {fileUploading && <Typography color="text.secondary">上传中...</Typography>}
            </Box>

            {/* AI智能识别区域 */}
            <Box sx={{
              p: 2,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.200',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                <SmartToyIcon color="primary" sx={{ fontSize: 24 }} />
                <Box>
                  <Typography variant="subtitle1" color="primary" fontWeight="600">
                    AI智能识别
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    基于标题和内容自动识别分类、标签和摘要
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="需要填写标题和内容才能进行AI分析">
                  <span>
                    <Button
                      variant="contained"
                      startIcon={aiAnalyzing ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                      onClick={handleAiAnalyze}
                      disabled={aiAnalyzing || !editArticle.title.trim() || !editArticle.content.trim()}
                      size="medium"
                      sx={{ minWidth: 120, fontWeight: 600 }}
                    >
                      {aiAnalyzing ? '分析中...' : '开始分析'}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* AI分析结果显示 */}
            {aiSuggestions && (
              <Alert severity="success" sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>AI分析建议：</Typography>
                  {aiSuggestions.category && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>建议分类：</strong>{aiSuggestions.category}
                    </Typography>
                  )}
                  {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>建议标签：</strong>{aiSuggestions.tags.join(', ')}
                    </Typography>
                  )}
                  {aiSuggestions.suggested_summary && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>建议摘要：</strong>{aiSuggestions.suggested_summary}
                    </Typography>
                  )}
                </Box>
                <Button variant="outlined" size="small" onClick={applyAiSuggestions}>
                  应用建议
                </Button>
              </Alert>
            )}

            <TextField 
              label="正文（Markdown）" 
              value={editArticle.content || ''} 
              onChange={e => {
                setEditArticle(a => ({ ...a, content: e.target.value }));
                setPreviewContent(e.target.value);
              }}
              fullWidth 
              multiline 
              minRows={10} 
              required 
            />

            {/* Markdown渲染预览区域 */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Markdown 渲染预览：</Typography>
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {previewContent || '在上方输入Markdown内容，这里将显示渲染效果...'}
                </ReactMarkdown>
              </Paper>
            </Box>
          </Stack>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={closeEdit}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>保存</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      {loading && <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(255,255,255,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6">加载中...</Typography>
      </Box>}
    </Box>
  );
};

export default ArticlesManager;
