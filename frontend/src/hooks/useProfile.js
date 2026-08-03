import { useEffect, useState } from 'react';
import { api, API_ENDPOINTS, getApiUrl } from '@/config/api';
import { getBlockContent, SITE_BLOCK_DEFAULTS } from '@/config/siteBlocks';

/**
 * 公共侧 profile 数据加载：site-blocks + avatars 并行拉取，
 * 解析当前头像并归一化 home/sidebar 内容块。
 *
 * 用于 TerminalWelcome 等公开组件；失败时回退到默认值。
 */
export function useProfile({ fallbackAvatar = '' } = {}) {
  const [homeBlock, setHomeBlock] = useState(SITE_BLOCK_DEFAULTS.home);
  const [sidebarBlock, setSidebarBlock] = useState(SITE_BLOCK_DEFAULTS.sidebar);
  const [avatarUrl, setAvatarUrl] = useState(fallbackAvatar);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchProfile = async () => {
      try {
        const [blocks, avatars] = await Promise.all([
          api.get(API_ENDPOINTS.PUBLIC.SITE_BLOCKS),
          api.get(API_ENDPOINTS.PUBLIC.AVATARS),
        ]);
        const currentAvatar = (avatars || []).find((avatar) => avatar.is_current);

        if (!ignore) {
          setHomeBlock(getBlockContent(blocks || [], 'home'));
          setSidebarBlock(getBlockContent(blocks || [], 'sidebar'));
          setAvatarUrl(
            currentAvatar ? getApiUrl.avatarFile(currentAvatar.filename) : fallbackAvatar
          );
        }
      } catch {
        if (!ignore) {
          setAvatarUrl(fallbackAvatar);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [fallbackAvatar]);

  return { homeBlock, sidebarBlock, avatarUrl, loading };
}
