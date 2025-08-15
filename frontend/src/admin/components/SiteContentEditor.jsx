import React from 'react';
import { Box, Typography, Paper, TextField, Button, Divider } from '@mui/material';

const SiteContentEditor = () => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>内容管理</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">首页介绍</Typography>
        <TextField fullWidth multiline minRows={2} sx={{ my: 2 }} label="首页介绍内容" />
        <Button variant="contained">保存</Button>
      </Paper>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">关于我</Typography>
        <TextField fullWidth multiline minRows={2} sx={{ my: 2 }} label="关于我内容" />
        <Button variant="contained">保存</Button>
      </Paper>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">技能</Typography>
        <TextField fullWidth multiline minRows={2} sx={{ my: 2 }} label="技能描述（可在技能管理详细编辑）" />
        <Button variant="contained">保存</Button>
      </Paper>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">联系方式</Typography>
        <TextField fullWidth multiline minRows={2} sx={{ my: 2 }} label="联系方式描述（可在联系方式管理详细编辑）" />
        <Button variant="contained">保存</Button>
      </Paper>
    </Box>
  );
};

export default SiteContentEditor; 