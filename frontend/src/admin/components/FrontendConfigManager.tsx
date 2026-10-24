import { useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, MenuItem, Stack } from '@mui/material';
import { PixelButton, PixelInput } from './pixelProps';
import useSiteBlockStore from '@/stores/siteBlockStore';
import useNotification from '../../hooks/useNotification';
import AvatarsManager from './AvatarsManager';
import { describeError } from '../utils/errors';
import {
  AdminFormStack,
  AdminPage,
  AdminSection,
} from './ui';
import type {
  SidebarContent,
  SiteBlockForm,
  SocialLinkType,
} from './ui/types';

/**
 * 社交图标类型选项：必须与前台 `components/sidebar/SocialLinks.jsx` 的 iconMap 完全对齐，
 * 否则后台选了图标、前台却回落到通用图标。
 */
const SOCIAL_LINK_TYPE_OPTIONS: Array<{ value: SocialLinkType; label: string }> = [
  { value: 'github', label: 'GitHub' },
  { value: 'email', label: '邮件' },
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'phone', label: '电话' },
  { value: 'other', label: '普通链接' },
];

/**
 * siteBlockStore 边界形状（store 仍是 JS zustand，无类型导出）。
 *
 * 只声明本页读写的部分：form 用 ui/types.ts 的具体形状（不退化成 any），
 * 方法签名与 store 里的同名 action 对齐（返回值本页不使用，故为 unknown）。
 */
type FormUpdater = (prev: SiteBlockForm) => SiteBlockForm;

interface SiteBlockStoreSlice {
  form: SiteBlockForm;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  fetchBlocks: () => Promise<unknown>;
  updateForm: (updater: SiteBlockForm | FormUpdater) => void;
  saveBlocks: () => Promise<unknown>;
}

const useSiteBlockFormStore = useSiteBlockStore as unknown as () => SiteBlockStoreSlice;

/** 侧边栏可增删改排的数组字段（数组下标即前台渲染顺序）。 */
type SidebarArrayKey = keyof SidebarContent;

/** 取某个数组字段的元素类型，让字段名/取值在调用点仍是具体类型。 */
type SidebarItem<K extends SidebarArrayKey> = SidebarContent[K][number];

/**
 * 写回某个数组字段。泛型 + 计算键（`[arrayKey]`）在类型层无法自我证明，
 * 收口到这一个 helper 里做一次窄化，调用点不再出现断言。
 */
const withSidebarItems = (
  prev: SiteBlockForm,
  arrayKey: SidebarArrayKey,
  items: unknown[],
): SiteBlockForm => ({
  ...prev,
  sidebar: { ...prev.sidebar, [arrayKey]: items } as SidebarContent,
});

/** 传入 changeArray 的各数组字段共用同一组增删改排实现，避免三份重复逻辑。 */

/** 更新数组项字段。 */
const updateArrayField = <K extends SidebarArrayKey, F extends keyof SidebarItem<K>>(
  arrayKey: K,
  index: number,
  field: F,
  value: SidebarItem<K>[F],
) => (prev: SiteBlockForm): SiteBlockForm => {
  const nextItems = [...(prev.sidebar[arrayKey] || [])] as SidebarItem<K>[];
  nextItems[index] = { ...nextItems[index], [field]: value } as SidebarItem<K>;
  return withSidebarItems(prev, arrayKey, nextItems);
};

/** 追加数组项。defaultItem 只含前台真实渲染的字段，避免新建出无效字段。 */
const addArrayItem = <K extends SidebarArrayKey>(
  arrayKey: K,
  defaultItem: SidebarItem<K>,
) => (prev: SiteBlockForm): SiteBlockForm => withSidebarItems(prev, arrayKey, [
  ...(prev.sidebar[arrayKey] || []),
  defaultItem,
]);

/** 删除数组项（下标越界时原样返回）。 */
const removeArrayItem = (arrayKey: SidebarArrayKey, index: number) => (prev: SiteBlockForm): SiteBlockForm => {
  const items = prev.sidebar[arrayKey] || [];
  if (index < 0 || index >= items.length) {
    return prev;
  }
  const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
  return withSidebarItems(prev, arrayKey, nextItems);
};

/** 移动数组项：数组下标即保存顺序，也就是前台渲染顺序。 */
const moveArrayItem = (arrayKey: SidebarArrayKey, from: number, to: number) => (prev: SiteBlockForm): SiteBlockForm => {
  const items = prev.sidebar[arrayKey] || [];
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return prev;
  }
  const nextItems = [...items];
  const [moved] = nextItems.splice(from, 1);
  nextItems.splice(to, 0, moved);
  return withSidebarItems(prev, arrayKey, nextItems);
};

interface ArrayItemActionsProps {
  index: number;
  length: number;
  /** 形如 `sidebar-social`，按钮 testid 为 `move-up-sidebar-social-0` 等。 */
  testIdPrefix: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/**
 * 数组项的行内操作按钮：上移 / 下移 / 删除。
 * testIdPrefix 形如 `sidebar-social`，按钮 testid 为 `move-up-sidebar-social-0` 等。
 */
function ArrayItemActions({
  index,
  length,
  testIdPrefix,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ArrayItemActionsProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <PixelButton
        variant="outline"
        size="small"
        data-testid={`move-up-${testIdPrefix}-${index}`}
        onClick={onMoveUp}
        disabled={index === 0}
      >
        上移
      </PixelButton>
      <PixelButton
        variant="outline"
        size="small"
        data-testid={`move-down-${testIdPrefix}-${index}`}
        onClick={onMoveDown}
        disabled={index === length - 1}
      >
        下移
      </PixelButton>
      <PixelButton
        variant="outline"
        size="small"
        color="error"
        data-testid={`remove-${testIdPrefix}-${index}`}
        onClick={onRemove}
      >
        删除
      </PixelButton>
    </Stack>
  );
}

export default function FrontendConfigManager() {
  // Store 数据状态
  const {
    form,
    loading,
    saving,
    error,
    loaded,
    fetchBlocks,
    updateForm,
    saveBlocks,
  } = useSiteBlockFormStore();

  const notify = useNotification();

  // 首屏加载与「重试加载」共用；失败原因由 store 的 error 呈现，这里只负责触发。
  const loadBlocks = useCallback(() => fetchBlocks().catch(() => {}), [fetchBlocks]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const setField = (section: 'home', field: keyof SiteBlockForm['home'], value: string) => {
    updateForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // 社交链接
  const setSidebarSocialField = (index: number, field: 'label' | 'href' | 'type', value: string) => updateForm(updateArrayField('social_links', index, field, value));
  const addSidebarSocialLink = () => updateForm(addArrayItem('social_links', { type: 'other', label: '', href: '' }));
  const removeSidebarSocialLink = (index: number) => updateForm(removeArrayItem('social_links', index));
  const moveSidebarSocialLink = (index: number, offset: number) => updateForm(moveArrayItem('social_links', index, index + offset));

  // 教育经历（前台只渲染 school/period）
  const setSidebarEducationField = (index: number, field: 'school' | 'period', value: string) => updateForm(updateArrayField('education', index, field, value));
  const addSidebarEducationItem = () => updateForm(addArrayItem('education', { school: '', period: '' }));
  const removeSidebarEducationItem = (index: number) => updateForm(removeArrayItem('education', index));
  const moveSidebarEducationItem = (index: number, offset: number) => updateForm(moveArrayItem('education', index, index + offset));

  // 技术栈（前台只渲染 name）
  const setSidebarTechField = (index: number, field: 'name', value: string) => updateForm(updateArrayField('tech_stack', index, field, value));
  const addSidebarTechItem = () => updateForm(addArrayItem('tech_stack', { name: '' }));
  const removeSidebarTechItem = (index: number) => updateForm(removeArrayItem('tech_stack', index));
  const moveSidebarTechItem = (index: number, offset: number) => updateForm(moveArrayItem('tech_stack', index, index + offset));

  const handleSave = async () => {
    try {
      await saveBlocks();
      notify.success('保存成功');
    } catch (error) {
      notify.error('保存失败: ' + describeError(error));
    }
  };

  const savingDisabled = !loaded || loading || saving;

  return (
    <AdminPage
      title="左侧内容栏管理"
      subtitle="只维护当前前台左侧内容栏真实生效字段，避免保留无效旧配置。"
      actions={(
        <PixelButton onClick={handleSave} disabled={savingDisabled}>
          保存配置
        </PixelButton>
      )}
    >
      <AdminFormStack spacing={3}>
        {!loaded && !loading && (
          <Alert
            severity="error"
            data-testid="site-blocks-load-error"
            action={(
              <PixelButton
                variant="ghost"
                color="inherit"
                size="small"
                data-testid="retry-load-site-blocks"
                onClick={loadBlocks}
              >
                重试加载
              </PixelButton>
            )}
          >
            配置加载失败{error ? `（${error}）` : ''}，为避免用默认值覆盖线上数据，保存已禁用。
          </Alert>
        )}

        <AdminSection title="头像管理">
          <AvatarsManager />
        </AdminSection>

        <AdminSection title="左侧内容栏基础信息">
          <AdminFormStack>
            <PixelInput
              fullWidth
              label="首页标题"
              data-testid="field-home-title"
              value={form.home.title || ''}
              onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField('home', 'title', event.target.value)}
            />
            <PixelInput
              fullWidth
              label="首页副标题"
              value={form.home.subtitle || ''}
              onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField('home', 'subtitle', event.target.value)}
            />
            <PixelInput
              fullWidth
              label="GitHub 日历源"
              value={form.home.github_calendar_url || ''}
              onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField('home', 'github_calendar_url', event.target.value)}
            />
          </AdminFormStack>
        </AdminSection>

        <AdminSection
          title="侧边栏社交链接"
          actions={(
            <PixelButton
              variant="outline"
              size="small"
              data-testid="add-sidebar-social-link"
              onClick={addSidebarSocialLink}
            >
              添加社交链接
            </PixelButton>
          )}
        >
          <AdminFormStack>
            {(form.sidebar.social_links || []).map((item, index, list) => (
              <AdminFormStack key={`social-${index}`}>
                <PixelInput
                  fullWidth
                  data-testid={`field-sidebar-social-label-${index}`}
                  label={`链接${index + 1}名称`}
                  value={item.label || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarSocialField(index, 'label', event.target.value)}
                />
                <PixelInput
                  fullWidth
                  data-testid={`field-sidebar-social-href-${index}`}
                  label={`链接${index + 1}地址`}
                  value={item.href || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarSocialField(index, 'href', event.target.value)}
                />
                <PixelInput
                  fullWidth
                  select
                  data-testid={`field-sidebar-social-type-${index}`}
                  label={`链接${index + 1}图标类型`}
                  value={item.type || 'other'}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarSocialField(index, 'type', event.target.value)}
                >
                  {SOCIAL_LINK_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </PixelInput>
                <ArrayItemActions
                  index={index}
                  length={list.length}
                  testIdPrefix="sidebar-social"
                  onMoveUp={() => moveSidebarSocialLink(index, -1)}
                  onMoveDown={() => moveSidebarSocialLink(index, 1)}
                  onRemove={() => removeSidebarSocialLink(index)}
                />
              </AdminFormStack>
            ))}
          </AdminFormStack>
        </AdminSection>

        <AdminSection
          title="侧边栏教育经历"
          actions={(
            <PixelButton
              variant="outline"
              size="small"
              data-testid="add-sidebar-education-item"
              onClick={addSidebarEducationItem}
            >
              添加教育经历
            </PixelButton>
          )}
        >
          <AdminFormStack>
            {(form.sidebar.education || []).map((item, index, list) => (
              <AdminFormStack key={`edu-${index}`}>
                <PixelInput
                  fullWidth
                  data-testid={`field-sidebar-education-school-${index}`}
                  label={`教育${index + 1}学校`}
                  value={item.school || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarEducationField(index, 'school', event.target.value)}
                />
                <PixelInput
                  fullWidth
                  data-testid={`field-sidebar-education-period-${index}`}
                  label={`教育${index + 1}时间`}
                  value={item.period || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarEducationField(index, 'period', event.target.value)}
                />
                <ArrayItemActions
                  index={index}
                  length={list.length}
                  testIdPrefix="sidebar-education"
                  onMoveUp={() => moveSidebarEducationItem(index, -1)}
                  onMoveDown={() => moveSidebarEducationItem(index, 1)}
                  onRemove={() => removeSidebarEducationItem(index)}
                />
              </AdminFormStack>
            ))}
          </AdminFormStack>
        </AdminSection>

        <AdminSection
          title="侧边栏技术栈"
          actions={(
            <PixelButton
              variant="outline"
              size="small"
              data-testid="add-sidebar-tech-item"
              onClick={addSidebarTechItem}
            >
              添加技术项
            </PixelButton>
          )}
        >
          <AdminFormStack>
            {(form.sidebar.tech_stack || []).map((item, index, list) => (
              <AdminFormStack key={`tech-${index}`}>
                <PixelInput
                  fullWidth
                  data-testid={`field-sidebar-tech-name-${index}`}
                  label={`技术${index + 1}名称`}
                  value={item.name || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSidebarTechField(index, 'name', event.target.value)}
                />
                <ArrayItemActions
                  index={index}
                  length={list.length}
                  testIdPrefix="sidebar-tech"
                  onMoveUp={() => moveSidebarTechItem(index, -1)}
                  onMoveDown={() => moveSidebarTechItem(index, 1)}
                  onRemove={() => removeSidebarTechItem(index)}
                />
              </AdminFormStack>
            ))}
          </AdminFormStack>
        </AdminSection>
      </AdminFormStack>
    </AdminPage>
  );
}
