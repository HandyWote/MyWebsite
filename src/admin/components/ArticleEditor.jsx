import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Chip, Stack } from '@mui/material';

const ArticleEditor = () => {
  const [content, setContent] = useState('');
  // TODO: 其它字段、API对接、Markdown预览
  return (
    <Box>
      <Typography variant="h5" gutterBottom>文章编辑</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField label="标题" fullWidth sx={{ mb: 2 }} />
        <TextField label="分类" fullWidth sx={{ mb: 2 }} />
        <TextField label="标签（逗号分隔）" fullWidth sx={{ mb: 2 }} />
        <Button variant="outlined" component="label" sx={{ mb: 2 }}>
          上传封面图片
          <input type="file" hidden />
        </Button>
        <TextField label="摘要" fullWidth multiline minRows={2} sx={{ mb: 2 }} />
        <TextField
          label="正文（Markdown）"
          fullWidth
          multiline
          minRows={10}
          value={content}
          onChange={e => setContent(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" sx={{ mr: 2 }}>保存</Button>
        <Button variant="outlined">预览</Button>
      </Paper>
      {/* TODO: Markdown预览区 */}
    </Box>
  );
};

export default ArticleEditor; 