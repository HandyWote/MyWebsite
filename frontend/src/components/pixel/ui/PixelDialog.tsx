// frontend/src/components/pixel/ui/PixelDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  useTheme,
} from '@mui/material';
import type { DialogProps } from '@mui/material/Dialog';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { colors, typography, spacing } from '../tokens';
import PixelButton from './PixelButton';
import type { PixelButtonProps } from './PixelButton';
import PixelTypography from './PixelTypography';

/** 标题强调色：取 MUI 主题 palette 名（默认强调蓝）。 */
export type PixelDialogTitleColor = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

const resolveTitleColor = (theme: Theme, titleColor: PixelDialogTitleColor): string => {
  if (titleColor === 'primary') return colors.accent.blue;
  return theme.palette[titleColor].main;
};

/**
 * PixelDialog - 终端风格对话框
 *
 * 基于 MUI Dialog 的通用弹窗容器，视觉对齐 ConfirmDialog 的样式模式
 * （直角、实线边框、bg.secondary 由全局像素主题提供，无需重复设置）。
 *
 * Props（其余 props 透传给 MUI Dialog：maxWidth / fullWidth / fullScreen / scroll / sx ...）：
 *   open       - 是否显示（受控）
 *   title      - 可选标题，使用 PixelTypography（h6 / code / 强调色）渲染
 *   titleColor - 可选标题强调色，取 MUI 主题 palette 名（如 'error' / 'warning'），
 *                默认强调蓝
 *   onClose    - 关闭回调（Esc 或点击遮罩时触发）
 *   actions    - 可选底部操作区节点，渲染在 DialogActions 中（右对齐、上边框分隔）
 *   children   - 内容区（可以放表单、预览等任意节点）
 *
 * 关于「确认弹窗」：本文件同时导出 PixelConfirmDialog（见下方），
 * 后台既有 `ConfirmDialog(open,title,message,confirmText,cancelText,severity,
 * onConfirm,onCancel,onClose)` 的用法请直接换用 PixelConfirmDialog，
 * 而不是给 PixelDialog 再塞一个 confirm 参数——两者职责分开：
 * PixelDialog 是容器，PixelConfirmDialog 是「确认/取消」这一种具体用法。
 *
 * 已知坑（勿回退）：DialogTitle 默认渲染 h2，标题文字必须用 component="span"
 * 渲染，否则会在 h2 内嵌套 h6 造成水合错误。
 */
// `title` 同时是 HTML 的全局属性（string），会与下面的 ReactNode 槽位相交成
// `string & ReactNode`，故先从 MUI props 剔除（本组件自己渲染标题，从不透传给 DOM）。
export type PixelDialogProps = Omit<DialogProps, 'title'> & {
  title?: ReactNode;
  titleColor?: PixelDialogTitleColor;
  actions?: ReactNode;
};

export function PixelDialog({
  open,
  title,
  titleColor,
  onClose,
  actions,
  children,
  ...props
}: PixelDialogProps) {
  const theme = useTheme();

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
          <PixelTypography
            component="span"
            variant="h6"
            code
            accent={!titleColor || titleColor === 'primary'}
            sx={titleColor ? { color: resolveTitleColor(theme, titleColor) } : undefined}
          >
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

/** 确认按钮/标题的强调色：与 MUI palette 名一致（默认 primary）。 */
export type PixelConfirmSeverity = 'primary' | 'error' | 'warning' | 'success';

export type PixelConfirmDialogProps = Omit<PixelDialogProps, 'actions' | 'onClose'> & {
  /** 描述文本（也可用 children 放表单/预览等自定义内容）。 */
  message?: ReactNode;
  /** 确认按钮文案，默认「确认」。 */
  confirmText?: ReactNode;
  /** 取消按钮文案，默认「取消」。 */
  cancelText?: ReactNode;
  /** 确认按钮颜色 / 标题强调色，默认 primary。 */
  severity?: PixelConfirmSeverity;
  /** 点击确认时调用；随后调用 onClose（如果提供），与后台原 ConfirmDialog 的「确认后自动关闭」行为一致。 */
  onConfirm?: () => void;
  /** 点击取消、按 Esc、点击遮罩时调用（父组件负责把 open 置 false）。 */
  onCancel?: () => void;
  /** 可选，确认之后的关闭通知。 */
  onClose?: () => void;
  /** 可选，追加在 message 下方的自定义内容。 */
  children?: ReactNode;
  /** 可选，透传给确认按钮的 PixelButton props。 */
  confirmButtonProps?: Omit<PixelButtonProps, 'children'>;
  /** 可选，透传给取消按钮的 PixelButton props。 */
  cancelButtonProps?: Omit<PixelButtonProps, 'children'>;
};

/**
 * PixelConfirmDialog - 终端风格「确认/取消」对话框
 *
 * 由 PixelDialog + PixelButton 组合而成，替代后台手搓的 ConfirmDialog 与散落的
 * window.confirm。直角 + 实线边框的观感来自全局像素主题与 PixelDialog。
 */
export function PixelConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  severity = 'primary',
  onConfirm,
  onCancel,
  onClose,
  children,
  confirmButtonProps,
  cancelButtonProps,
  ...props
}: PixelConfirmDialogProps) {
  const severityColor = severity !== 'primary' ? severity : undefined;

  const handleCancel = () => {
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  return (
    <PixelDialog
      open={open}
      title={title}
      titleColor={severityColor}
      onClose={handleCancel}
      {...props}
      actions={(
        <>
          <PixelButton variant="ghost" onClick={handleCancel} {...cancelButtonProps}>
            {cancelText}
          </PixelButton>
          <PixelButton
            variant="primary"
            color={severityColor ?? 'primary'}
            onClick={handleConfirm}
            {...confirmButtonProps}
          >
            {confirmText}
          </PixelButton>
        </>
      )}
    >
      <Stack spacing={spacing.md}>
        {message && (
          <PixelTypography variant="body2" code sx={{ color: colors.text.secondary }}>
            {message}
          </PixelTypography>
        )}
        {children}
      </Stack>
    </PixelDialog>
  );
}

export default PixelDialog;
