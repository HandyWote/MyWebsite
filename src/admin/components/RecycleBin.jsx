import React from 'react';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const RecycleBin = () => {
  // TODO: 这里应从API加载回收站数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>回收站</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>内容摘要</TableCell>
              <TableCell>删除时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 示例数据 */}
            <TableRow>
              <TableCell>文章</TableCell>
              <TableCell>示例文章1</TableCell>
              <TableCell>2024-05-01</TableCell>
              <TableCell>
                <IconButton color="primary"><RestoreIcon /></IconButton>
                <IconButton color="error"><DeleteForeverIcon /></IconButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>技能</TableCell>
              <TableCell>Python</TableCell>
              <TableCell>2024-05-02</TableCell>
              <TableCell>
                <IconButton color="primary"><RestoreIcon /></IconButton>
                <IconButton color="error"><DeleteForeverIcon /></IconButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" color="error" sx={{ mt: 2 }}>清空回收站</Button>
    </Box>
  );
};

export default RecycleBin; 