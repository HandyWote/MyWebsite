import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { getApiUrl, unwrapApiPayload } from '../../config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '../../config/siteBlocks';

const HOME_FIELD_KEYS = ['title', 'subtitle', 'github_calendar_url'];

const pickHomeFields = (source = {}) => HOME_FIELD_KEYS.reduce((acc, key) => {
  acc[key] = source[key] ?? SITE_BLOCK_DEFAULTS.home[key] ?? '';
  return acc;
}, {});

const createInitialForm = () => ({
  home: pickHomeFields(SITE_BLOCK_DEFAULTS.home),
  sidebar: { ...SITE_BLOCK_DEFAULTS.sidebar },
});

const normalizeBlocksToForm = (blocks) => ({
  home: pickHomeFields(getBlockContent(blocks, 'home')),
  sidebar: getBlockContent(blocks, 'sidebar'),
});

export default function FrontendConfigManager() {
  const [form, setForm] = useState(createInitialForm());
  const [saving, setSaving] = useState(false);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const fetchBlocks = async () => {
    const res = await fetch(getApiUrl.adminSiteBlocks(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const blocks = unwrapApiPayload(data) || [];
    setForm(normalizeBlocksToForm(blocks));
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const setField = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const setSidebarSocialField = (index, field, value) => {
    setForm((prev) => {
      const nextLinks = [...(prev.sidebar.social_links || [])];
      nextLinks[index] = {
        ...(nextLinks[index] || {}),
        [field]: value,
      };
      return {
        ...prev,
        sidebar: {
          ...prev.sidebar,
          social_links: nextLinks,
        },
      };
    });
  };

  const addSidebarSocialLink = () => {
    setForm((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        social_links: [
          ...(prev.sidebar.social_links || []),
          { type: 'other', label: '', href: '', value: '' },
        ],
      },
    }));
  };

  const setSidebarEducationField = (index, field, value) => {
    setForm((prev) => {
      const nextItems = [...(prev.sidebar.education || [])];
      nextItems[index] = {
        ...(nextItems[index] || {}),
        [field]: value,
      };
      return {
        ...prev,
        sidebar: {
          ...prev.sidebar,
          education: nextItems,
        },
      };
    });
  };

  const addSidebarEducationItem = () => {
    setForm((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        education: [
          ...(prev.sidebar.education || []),
          { school: '', period: '', desc: '' },
        ],
      },
    }));
  };

  const setSidebarTechField = (index, field, value) => {
    setForm((prev) => {
      const nextItems = [...(prev.sidebar.tech_stack || [])];
      nextItems[index] = {
        ...(nextItems[index] || {}),
        [field]: value,
      };
      return {
        ...prev,
        sidebar: {
          ...prev.sidebar,
          tech_stack: nextItems,
        },
      };
    });
  };

  const addSidebarTechItem = () => {
    setForm((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        tech_stack: [
          ...(prev.sidebar.tech_stack || []),
          { name: '', level: '' },
        ],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        blocks: [
          { name: 'home', content: pickHomeFields(form.home) },
          { name: 'sidebar', content: form.sidebar },
        ],
      };

      await fetch(getApiUrl.adminSiteBlocks(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>左侧内容栏管理</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        只维护当前前台左侧内容栏真实生效字段，避免保留无效旧配置。
      </Typography>

      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>头像管理</Typography>
          <Typography variant="body2" color="text.secondary">
            下一步将在此区块内统一完成头像上传、删除与设为当前头像操作。
          </Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>左侧内容栏基础信息</Typography>
          <TextField
            fullWidth
            label="首页标题"
            data-testid="field-home-title"
            value={form.home.title || ''}
            onChange={(event) => setField('home', 'title', event.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            label="首页副标题"
            value={form.home.subtitle || ''}
            onChange={(event) => setField('home', 'subtitle', event.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            fullWidth
            label="GitHub 日历源"
            value={form.home.github_calendar_url || ''}
            onChange={(event) => setField('home', 'github_calendar_url', event.target.value)}
          />
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>侧边栏社交链接</Typography>
          <Button
            variant="outlined"
            size="small"
            data-testid="add-sidebar-social-link"
            onClick={addSidebarSocialLink}
            sx={{ mb: 1 }}
          >
            添加社交链接
          </Button>
          {(form.sidebar.social_links || []).map((item, index) => (
            <Box key={`social-${index}`} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                data-testid={`field-sidebar-social-label-${index}`}
                label={`链接${index + 1}名称`}
                value={item.label || ''}
                onChange={(event) => setSidebarSocialField(index, 'label', event.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                data-testid={`field-sidebar-social-href-${index}`}
                label={`链接${index + 1}地址`}
                value={item.href || ''}
                onChange={(event) => setSidebarSocialField(index, 'href', event.target.value)}
              />
            </Box>
          ))}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>侧边栏教育经历</Typography>
          <Button
            variant="outlined"
            size="small"
            data-testid="add-sidebar-education-item"
            onClick={addSidebarEducationItem}
            sx={{ mb: 1 }}
          >
            添加教育经历
          </Button>
          {(form.sidebar.education || []).map((item, index) => (
            <Box key={`edu-${index}`} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                data-testid={`field-sidebar-education-school-${index}`}
                label={`教育${index + 1}学校`}
                value={item.school || ''}
                onChange={(event) => setSidebarEducationField(index, 'school', event.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                data-testid={`field-sidebar-education-period-${index}`}
                label={`教育${index + 1}时间`}
                value={item.period || ''}
                onChange={(event) => setSidebarEducationField(index, 'period', event.target.value)}
              />
            </Box>
          ))}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>侧边栏技术栈</Typography>
          <Button
            variant="outlined"
            size="small"
            data-testid="add-sidebar-tech-item"
            onClick={addSidebarTechItem}
            sx={{ mb: 1 }}
          >
            添加技术项
          </Button>
          {(form.sidebar.tech_stack || []).map((item, index) => (
            <Box key={`tech-${index}`} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                data-testid={`field-sidebar-tech-name-${index}`}
                label={`技术${index + 1}名称`}
                value={item.name || ''}
                onChange={(event) => setSidebarTechField(index, 'name', event.target.value)}
              />
            </Box>
          ))}
        </Paper>

      </Stack>

      <Button sx={{ mt: 2 }} variant="contained" onClick={handleSave} disabled={saving}>
        保存配置
      </Button>
    </Box>
  );
}
