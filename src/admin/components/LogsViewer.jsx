import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const LogsViewer = () => {
  // TODO: 这里应从API加载日志数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>操作日志</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>操作人</TableCell>
              <TableCell>时间</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>详情</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 示例数据 */}
            <TableRow>
              <TableCell>admin</TableCell>
              <TableCell>2024-05-01 12:00</TableCell>
              <TableCell>新增文章</TableCell>
              <TableCell>标题：示例文章1</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>admin</TableCell>
              <TableCell>2024-05-02 09:30</TableCell>
              <TableCell>删除技能</TableCell>
              <TableCell>技能：Python</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LogsViewer; 