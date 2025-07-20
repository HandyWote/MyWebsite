import React from 'react';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Checkbox, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ArticlesManager = () => {
  // TODO: 这里应从API加载文章数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>文章管理</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField label="搜索标题/标签" size="small" sx={{ mr: 2 }} />
        <Button variant="contained">新建文章</Button>
        <Button variant="outlined" sx={{ ml: 2 }}>批量删除</Button>
        <Button variant="outlined" sx={{ ml: 2 }}>回收站</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell>标题</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 示例数据 */}
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell>示例文章1</TableCell>
              <TableCell>前端</TableCell>
              <TableCell>React,JS</TableCell>
              <TableCell>2024-05-01</TableCell>
              <TableCell>
                <IconButton><EditIcon /></IconButton>
                <IconButton color="error"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell>示例文章2</TableCell>
              <TableCell>后端</TableCell>
              <TableCell>Python,API</TableCell>
              <TableCell>2024-05-02</TableCell>
              <TableCell>
                <IconButton><EditIcon /></IconButton>
                <IconButton color="error"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ArticlesManager; 