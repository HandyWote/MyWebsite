import React from 'react';
import { Box, Typography, Paper, Button, Avatar, Grid, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const AvatarsManager = () => {
  // TODO: 这里应从API加载头像数据
  return (
    <Box>
      <Typography variant="h5" gutterBottom>头像管理</Typography>
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6">当前头像</Typography>
        <Avatar src="/avatar.jpg" sx={{ width: 100, height: 100, mx: 'auto', my: 2 }} />
        <Button variant="contained" sx={{ mt: 2 }}>上传新头像</Button>
        <Button variant="outlined" sx={{ mt: 2, ml: 2 }}>裁剪头像</Button>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>历史头像</Typography>
        <Grid container spacing={2}>
          {/* 示例历史头像 */}
          {[1,2,3].map(id => (
            <Grid item key={id}>
              <Avatar src={`/avatar${id}.jpg`} sx={{ width: 60, height: 60 }} />
              <IconButton color="error" size="small"><DeleteIcon /></IconButton>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default AvatarsManager; 