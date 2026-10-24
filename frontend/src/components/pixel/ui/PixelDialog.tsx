// frontend/src/components/pixel/ui/PixelDialog.jsx
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { colors, typography, spacing } from '../tokens';
import PixelTypography from './PixelTypography';

/**
 * PixelDialog - 终端风格对话框
 *
 * 基于 MUI Dialog 的通用弹窗容器，视觉对齐 ConfirmDialog 的样式模式
 * （直角、实线边框、bg.secondary 由全局像素主题提供，无需重复设置）。
 *
 * Props:
 *   open     - 是否显示（受控）
 *   title    - 可选标题，使用 PixelTypography（h6 / code / accent 蓝色）渲染
 *   onClose  - 关闭回调（Esc 或点击遮罩时触发）
 *   actions  - 可选底部操作区节点，渲染在 DialogActions 中（右对齐、上边框分隔）
 *   children - 内容区
 *   其余 props 透传给 MUI Dialog
 */
export function PixelDialog({ open, title, onClose, actions, children, ...props }) {
  return (
    <Dialog open={open} onClose={onClose} {...props}>
      {title && (
        <DialogTitle
          sx={{
            borderBottom: `1px solid ${colors.border.default}`,
            pb: spacing.md,
          }}
        >
          {/* component="span"：避免 DialogTitle(h2) 内嵌套 h6 造成水合错误；
              视觉仍应用 h6 字号样式，标题语义保留在 h2。 */}
          <PixelTypography component="span" variant="h6" code accent>
            {title}
          </PixelTypography>
        </DialogTitle>
      )}
      <DialogContent sx={{ py: spacing.lg }}>{children}</DialogContent>
      {actions && (
        <DialogActions
          sx={{
            px: spacing.md,
            pt: spacing.sm,
            pb: spacing.md,
            borderTop: `1px solid ${colors.border.default}`,
            justifyContent: 'flex-end',
            fontFamily: typography.fontFamily.mono,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

export default PixelDialog;
