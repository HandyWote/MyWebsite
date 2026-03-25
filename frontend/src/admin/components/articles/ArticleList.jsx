import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  Chip,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

/**
 * 文章列表展示组件（纯渲染）
 * 支持表格视图、分页、多选
 */
export default function ArticleList({
  articles,
  loading,
  onEdit,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  pagination = { page: 1, perPage: 10, total: 0 },
  onPageChange,
  onRowsPerPageChange,
}) {
  // 加载状态
  if (loading && articles.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 空状态
  if (articles.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="text.secondary">暂无文章</Typography>
      </Box>
    );
  }

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      onSelectionChange?.(articles.map((a) => a.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelect = (id) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onSelectionChange?.(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    onPageChange?.(newPage + 1); // TablePagination uses 0-indexed
  };

  const handleChangeRowsPerPage = (event) => {
    onRowsPerPageChange?.(parseInt(event.target.value, 10));
  };

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {onSelectionChange && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedIds.length > 0 && selectedIds.length < articles.length
                    }
                    checked={
                      articles.length > 0 && selectedIds.length === articles.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>标题</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>摘要</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles.map((article) => (
              <TableRow
                key={article.id}
                selected={selectedIds.includes(article.id)}
                hover
              >
                {onSelectionChange && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(article.id)}
                      onChange={() => handleSelect(article.id)}
                    />
                  </TableCell>
                )}
                <TableCell>{article.title}</TableCell>
                <TableCell>{article.category || '-'}</TableCell>
                <TableCell>
                  {article.tags && article.tags.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(Array.isArray(article.tags) ? article.tags : article.tags.split(',')).slice(0, 3).map((tag, i) => (
                        <Chip key={i} label={tag} size="small" />
                      ))}
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {article.summary || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {article.created_at
                    ? new Date(article.created_at).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => onEdit(article)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => onDelete(article.id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1} // TablePagination uses 0-indexed
          rowsPerPage={pagination.perPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="每页行数"
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}
    </Paper>
  );
}
