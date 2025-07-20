import React from 'react';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const SkillsManager = () => {
  // TODO: 这里应从API加载技能数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>技能管理</Typography>
      <Button variant="contained" sx={{ mb: 2 }}>新增技能</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>熟练度</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 示例数据 */}
            <TableRow>
              <TableCell>React</TableCell>
              <TableCell>前端开发框架</TableCell>
              <TableCell>90</TableCell>
              <TableCell>
                <IconButton><EditIcon /></IconButton>
                <IconButton color="error"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Python</TableCell>
              <TableCell>后端开发语言</TableCell>
              <TableCell>85</TableCell>
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

export default SkillsManager; 