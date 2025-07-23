import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, TextField, Paper, Divider, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const PreviewBox = styled(Paper)(({ theme }) => ({
  padding: '2rem',
  borderRadius: '1rem',
  maxWidth: '800px',
  margin: '0 auto',
  minHeight: '300px',
  background: '#fff',
  boxShadow: 'rgba(0,0,0,0.08) 0px 2px 8px',
  opacity: 1,
  transition: 'transform linear',
}));

const fieldLabels = [
  { key: 'education_background', label: '教育背景' },
  { key: 'hobbies', label: '兴趣爱好' },
  { key: 'personal_vision', label: '个人愿景' },
];

export default function AboutManager() {
  const [fields, setFields] = useState({
    education_background: '',
    hobbies: '',
    personal_vision: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 拉取数据
  const fetchAbout = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/site-blocks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const about = res.data.data.find((b) => b.name === 'about');
      if (about && about.content) {
        setFields({
          education_background: about.content.education_background || '',
          hobbies: about.content.hobbies || '',
          personal_vision: about.content.personal_vision || '',
        });
        setLastUpdated(about.updated_at);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbout();
  }, []);

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        '/api/admin/site-blocks',
        { blocks: [ { name: 'about', content: fields } ] },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchAbout();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      <Typography variant="h4" align="center" gutterBottom>关于我管理</Typography>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {/* 编辑区 */}
        <Box sx={{ flex: 1, minWidth: 320 }}>
          {fieldLabels.map(({ key, label }) => (
            <Box key={key} sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>{label}</Typography>
              <TextField
                multiline
                minRows={1}
                maxRows={12}
                fullWidth
                value={fields[key]}
                onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                placeholder={`请输入${label}，可用HTML标签美化内容`}
                variant="standard"
                InputProps={{
                  style: {
                    fontSize: 16,
                    paddingTop: 2,
                    paddingBottom: 0,
                  }
                }}
              />
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
              disableElevation
            >
              {saving ? <CircularProgress size={20} /> : '保存全部更改'}
            </Button>
            <Button
              variant="outlined"
              onClick={fetchAbout}
              disabled={loading}
              disableElevation
            >
              {loading ? <CircularProgress size={20} /> : '手动刷新'}
            </Button>
          </Box>
        </Box>
        {/* 预览区 */}
        <Box sx={{ flex: 1, minWidth: 320 }}>
          <Typography variant="h6" align="center" sx={{ mb: 2 }}>实时预览</Typography>
          <PreviewBox>
            <Typography variant="h3" align="center" gutterBottom>关于我</Typography>
            <Divider sx={{ mb: 2 }} />
            {fieldLabels.map(({ key, label }) => (
              <Box key={key} sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>{label}</Typography>
                <Typography variant="body1" paragraph component="div"
                  sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }}
                  dangerouslySetInnerHTML={{ __html: fields[key] || `<span style='color:#aaa'>暂无内容</span>` }}
                />
              </Box>
            ))}
          </PreviewBox>
        </Box>
      </Box>
    </Box>
  );
} 