import { useEffect } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import useSiteBlockStore from '@/stores/siteBlockStore';
import useNotification from '../../hooks/useNotification';
import AvatarsManager from './AvatarsManager';

/**
 * 通用数组字段更新函数。
 * 替代 setSidebarSocialField/setSidebarEducationField/setSidebarTechField 三组重复逻辑。
 */
const updateArrayField = (section, arrayKey, index, field, value) => (prev) => {
  const nextItems = [...(prev[section]?.[arrayKey] || [])];
  nextItems[index] = { ...(nextItems[index] || {}), [field]: value };
  return { ...prev, [section]: { ...prev[section], [arrayKey]: nextItems } };
};

/**
 * 通用数组项追加函数。
 * 替代 addSidebarSocialLink/addSidebarEducationItem/addSidebarTechItem 三组重复逻辑。
 */
const addArrayItem = (section, arrayKey, defaultItem) => (prev) => ({
  ...prev,
  [section]: {
    ...prev[section],
    [arrayKey]: [...(prev[section]?.[arrayKey] || []), defaultItem],
  },
});

export default function FrontendConfigManager() {
  // Store 数据状态
  const {
    form,
    saving,
    fetchBlocks,
    updateForm,
    saveBlocks,
  } = useSiteBlockStore();

  const notify = useNotification();

  useEffect(() => {
    fetchBlocks().catch(() => {});
  }, []);

  const setField = (section, field, value) => {
    updateForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const setSidebarSocialField = (index, field, value) => updateForm(updateArrayField('sidebar', 'social_links', index, field, value));

  const addSidebarSocialLink = () => updateForm(addArrayItem('sidebar', 'social_links', { type: 'other', label: '', href: '', value: '' }));

  const setSidebarEducationField = (index, field, value) => updateForm(updateArrayField('sidebar', 'education', index, field, value));

  const addSidebarEducationItem = () => updateForm(addArrayItem('sidebar', 'education', { school: '', period: '', desc: '' }));

  const setSidebarTechField = (index, field, value) => updateForm(updateArrayField('sidebar', 'tech_stack', index, field, value));

  const addSidebarTechItem = () => updateForm(addArrayItem('sidebar', 'tech_stack', { name: '', level: '' }));

  const handleSave = async () => {
    try {
      await saveBlocks();
      notify.notify().success('保存成功');
    } catch (error) {
      notify.notify().error('保存失败: ' + error.message);
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
          <AvatarsManager />
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
