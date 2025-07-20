import React from 'react';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ContactsManager = () => {
  // TODO: 这里应从API加载联系方式数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>联系方式管理</Typography>
      <Button variant="contained" sx={{ mb: 2 }}>新增联系方式</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 示例数据 */}
            <TableRow>
              <TableCell>邮箱</TableCell>
              <TableCell>example@email.com</TableCell>
              <TableCell>
                <IconButton><EditIcon /></IconButton>
                <IconButton color="error"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>微信</TableCell>
              <TableCell>mywechatid</TableCell>
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

export default ContactsManager; 