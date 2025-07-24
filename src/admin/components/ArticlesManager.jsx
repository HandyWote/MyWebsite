import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Checkbox, IconButton, Typography, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { marked } from 'marked';
import xss from 'xss';
import Snackbar from '@mui/material/Snackbar';

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
  const [importProgress, setImportProgress] = useState({ total: 0, success: 0, fail: 0, failFiles: [] });

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
    } else {
      setEditArticle(article);
    }
    setEditId(id);
    setOpenDialog(true);
  };
  const closeEdit = () => { setOpenDialog(false); setEditArticle(defaultArticle); setEditId(null); };

  // 标签格式校验
  const validateTags = tags => /^[\u4e00-\u9fa5a-zA-Z0-9_,\-\s]+$/.test(tags);

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

  // 封面图片显示适配
  const getCoverUrl = cover => {
    if (!cover) return DEFAULT_COVER;
    if (/^https?:\/\//.test(cover)) return cover;
    return `http://localhost:5000${cover}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEdit()}>新增文章</Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={!selected.length} onClick={() => handleDelete(selected)}>批量删除</Button>
        <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>批量导入MD
          <input type="file" accept=".md" multiple hidden onChange={handleBatchImport} />
        </Button>
        <TextField size="small" placeholder="搜索标题" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} sx={{ width: 200 }} />
        <Button variant="outlined" onClick={handleSearch}>搜索</Button>
      </Stack>
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
        <DialogTitle>{editId ? '编辑文章' : '新增文章'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="标题" value={editArticle.title} onChange={e => setEditArticle(a => ({ ...a, title: e.target.value }))} fullWidth required />
            <TextField label="分类" value={editArticle.category} onChange={e => setEditArticle(a => ({ ...a, category: e.target.value }))} fullWidth />
            <TextField label="标签（逗号分隔）" value={editArticle.tags} onChange={e => setEditArticle(a => ({ ...a, tags: e.target.value }))} fullWidth error={!!editArticle.tags && !validateTags(editArticle.tags)} helperText={!!editArticle.tags && !validateTags(editArticle.tags) ? '标签格式不合法' : ''} />
            <TextField label="摘要" value={editArticle.summary} onChange={e => setEditArticle(a => ({ ...a, summary: e.target.value }))} fullWidth multiline minRows={2} />
            <TextField label="正文（Markdown）" value={editArticle.content} onChange={e => setEditArticle(a => ({ ...a, content: e.target.value }))} fullWidth multiline minRows={10} required />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={fileUploading}>上传封面
                <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
              </Button>
              {editArticle.cover && <img src={getCoverUrl(editArticle.cover)} alt="封面" style={{ width: 64, height: 40, objectFit: 'cover' }} onError={e => { e.target.onerror = null; e.target.src = DEFAULT_COVER; }} />}
              {fileUploading && <Typography color="text.secondary">上传中...</Typography>}
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Markdown 渲染预览：</Typography>
              <Paper variant="outlined" sx={{ p: 2, minHeight: 120, maxHeight: 300, overflow: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: xss(marked.parse(editArticle.content || '')) }} />
              </Paper>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
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