import React from 'react';
import { Box, Typography, Paper, Button, TextField } from '@mui/material';

const DataImportExport = () => {
  // TODO: API对接导入导出
  return (
    <Box>
      <Typography variant="h5" gutterBottom>数据导入导出</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Button variant="contained" sx={{ mr: 2 }}>导出全部数据（JSON）</Button>
        <Button variant="outlined" component="label">
          导入数据（JSON）
          <input type="file" hidden />
        </Button>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">导入数据预览</Typography>
        <TextField fullWidth multiline minRows={6} placeholder="导入的JSON内容预览..." />
      </Paper>
    </Box>
  );
};

export default DataImportExport; 