import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Box, Avatar, Paper, Stack, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { PixelButton, PixelConfirmDialog } from './pixelProps';
import useAvatarStore from '@/stores/avatarStore';
import useNotification from '../../hooks/useNotification';
import { colors } from '../../components/pixel/tokens';
import { describeError } from '../utils/errors';
import type { AvatarItem } from './ui/types';

/**
 * avatarStore 边界形状（store 仍是 JS zustand，无类型导出）。
 *
 * 只声明本组件读写的部分：avatars 用 ui/types.ts 的 AvatarItem（不退化成 any），
 * 方法签名与 store 里的同名 action 对齐。
 */
interface AvatarStoreSlice {
  avatars: AvatarItem[];
  loading: boolean;
  fetchAvatars: () => Promise<unknown>;
  uploadAvatar: (file: File) => Promise<unknown>;
  deleteAvatar: (avatarId: number) => Promise<{ msg?: string } | undefined>;
}

const useAvatarStateStore = useAvatarStore as unknown as () => AvatarStoreSlice;

/**
 * AvatarsManager - 单头像管理
 *
 * 头像只有一张：上传即替换（后端语义），前端不需要排序、不需要「设为当前头像」。
 * 这里只展示当前头像（is_current；缺失时回落到列表第一项）并允许重新上传或删除。
 */
export default function AvatarsManager() {
  const { avatars, loading, fetchAvatars, uploadAvatar, deleteAvatar } = useAvatarStateStore();

  const notify = useNotification();

  // 删除确认对话框
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const current = avatars.find((avatar) => avatar.is_current) ?? avatars[0] ?? null;

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAvatar(file);
      notify.success('上传成功');
    } catch (error) {
      notify.error('上传失败: ' + describeError(error));
    } finally {
      setUploading(false);
      // 允许重复选择同一个文件
      target.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      const data = await deleteAvatar(deleteConfirmId);
      notify.success(data?.msg || '已删除头像');
    } catch (error) {
      notify.error('删除失败: ' + describeError(error));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <PixelButton
          component="label"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={loading || uploading}
        >
          上传新头像
          <input type="file" accept="image/*" aria-label="选择头像文件" hidden onChange={handleUpload} />
        </PixelButton>
        <PixelButton variant="outline" onClick={() => fetchAvatars()} disabled={loading}>
          手动刷新
        </PixelButton>
      </Stack>

      <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        {current ? (
          <Card
            sx={{
              border: `1px dashed ${colors.border.default}`,
              '&:hover': {
                border: `1px solid ${colors.accent.blue}`,
                borderStyle: 'solid',
              },
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
              <Avatar
                src={current.url || undefined}
                alt="当前头像"
                sx={{ width: 160, height: 160, border: `3px solid ${colors.accent.blue}` }}
              />
              <Typography variant="body2" color="text.secondary">
                {current.uploaded_at ? `上传时间：${new Date(current.uploaded_at).toLocaleString()}` : '上传时间：未知'}
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, py: 1, bgcolor: 'action.hover', justifyContent: 'flex-end' }}>
              <PixelButton
                variant="ghost"
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setDeleteConfirmId(current.id)}
              >
                删除头像
              </PixelButton>
            </CardActions>
          </Card>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              暂无头像，请上传新头像
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 删除确认对话框（PixelConfirmDialog：确认后自动 onClose） */}
      <PixelConfirmDialog
        open={Boolean(deleteConfirmId)}
        title="确认删除"
        message="确定要删除该头像吗？此操作不可撤销。"
        confirmText="确认删除"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
        onClose={() => setDeleteConfirmId(null)}
      />
    </Box>
  );
}
