import React, { useEffect, useState } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination,
  TextField, Stack, Checkbox, IconButton, Typography,
  Alert, CircularProgress, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import Snackbar from '@mui/material/Snackbar';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config/api'; // 导入API配置
import ArticleEditDialog from './articles/ArticleEditDialog';
import AiSettingsDialog from './articles/AiSettingsDialog';

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
  const [socket, setSocket] = useState(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState({ prompt: '', model: '', base_url: '', api_key: '' });
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);

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
    const res = await fetch(`${getApiUrl.adminArticles()}?page=${params.page ?? page + 1}&per_page=${params.perPage ?? rowsPerPage}&search=${params.search ?? search}`,
      { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setArticles(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles({ page: 1 });
    
    // 初始化WebSocket连接
    const newSocket = io(`${getApiUrl.websocket()}/articles`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',
    });
    
    // 监听文章更新事件
    newSocket.on('articles_updated', () => {
      console.log('收到文章更新通知，刷新数据...');
      fetchArticles({ page: page + 1 });
    });
    
    // 监听连接事件
    newSocket.on('connect', () => {
      console.log('WebSocket连接已建立');
    });
    
    newSocket.on('disconnect', () => {
      console.log('WebSocket连接已断开');
    });
    
    setSocket(newSocket);
    
    // 清理函数
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

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
      const res = await fetch(getApiUrl.adminArticleDetail(id), {
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

      const response = await fetch(getApiUrl.adminArticleAiAnalyze(), {
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
      const url = editId ? getApiUrl.adminArticleDetail(editId) : getApiUrl.adminArticles();
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
        await fetch(getApiUrl.adminArticleBatchDelete(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ids: idArr })
        });
      } else {
                  await fetch(`${getApiUrl.adminArticles()}/${idArr[0]}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
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
          const res = await fetch(getApiUrl.adminArticleCover(), {
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
      const res = await fetch(getApiUrl.adminArticleImportMd(), {
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
            return `${getApiUrl.websocket()}${cover}`;
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
          const articleRes = await fetch(getApiUrl.adminArticleDetail(articleId), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const articleData = await articleRes.json();
          
          if (!articleData.title || !articleData.content) {
            failCount++;
            failedArticles.push({ id: articleId, title: articleData.title || '未知标题', error: '标题或内容为空' });
            continue;
          }
          
          // AI分析
                      const aiRes = await fetch(getApiUrl.adminArticleAiAnalyze(), {
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
            
            const updateRes = await fetch(getApiUrl.adminArticleDetail(articleId), {
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

  const fetchAiSettings = async () => {
    setAiSettingsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl.adminAiSettings(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('读取AI设置失败');
      }
      const json = await res.json();
      const payload = json.data || {};
      setAiSettings({
        prompt: payload.prompt || '',
        model: payload.model || '',
        base_url: payload.base_url || '',
        api_key: ''
      });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setAiSettingsLoading(false);
    }
  };

  const handleOpenAiSettings = () => {
    setAiSettingsOpen(true);
    fetchAiSettings();
  };

  const handleSaveAiSettings = async () => {
    setAiSettingsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl.adminAiSettings(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiSettings)
      });
      if (!res.ok) {
        throw new Error('保存AI设置失败');
      }
      setSnackbar({ open: true, message: 'AI设置已保存', severity: 'success' });
      setAiSettingsOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setAiSettingsSaving(false);
    }
  };

  const handleTestAiSettings = async () => {
    setAiTesting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl.adminAiSettingsTest(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiSettings)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.msg || '测试失败');
      }
      setSnackbar({ open: true, message: data.msg || 'AI服务可用', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setAiTesting(false);
    }
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
        <Button
          variant="outlined"
          startIcon={<SettingsSuggestIcon />}
          onClick={handleOpenAiSettings}
          size="small"
        >
          AI设置
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
      <ArticleEditDialog
        open={openDialog}
        loading={loading}
        isEdit={Boolean(editId)}
        article={editArticle}
        onClose={closeEdit}
        onSave={handleSave}
        onArticleChange={setEditArticle}
        validateTags={validateTags}
        fileUploading={fileUploading}
        onUploadCover={handleUploadCover}
        coverPreview={getCoverUrl(editArticle.cover)}
        aiAnalyzing={aiAnalyzing}
        aiSuggestions={aiSuggestions}
        onAiAnalyze={handleAiAnalyze}
        onApplySuggestions={applyAiSuggestions}
        previewContent={previewContent}
        onPreviewContentChange={setPreviewContent}
        onMarkdownError={(message, severity) => setSnackbar({ open: true, message, severity })}
      />
      <AiSettingsDialog
        open={aiSettingsOpen}
        loading={aiSettingsLoading}
        saving={aiSettingsSaving}
        testing={aiTesting}
        settings={aiSettings}
        onClose={() => setAiSettingsOpen(false)}
        onChange={setAiSettings}
        onSave={handleSaveAiSettings}
        onTest={handleTestAiSettings}
      />
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
