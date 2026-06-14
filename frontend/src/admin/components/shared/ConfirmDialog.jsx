import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { colors, typography } from '../../../components/pixel/tokens';

/**
 * ConfirmDialog - 统一的确认对话框
 * 复用 pixel terminal 风格，替代散落在各组件中的 window.confirm 和内联删除对话框。
 *
 * Props:
 *   open        - 是否显示（受控）
 *   title       - 标题
 *   message     - 描述文本
 *   confirmText - 确认按钮文案（默认"确认"）
 *   cancelText  - 取消按钮文案（默认"取消"）
 *   severity    - 确认按钮颜色：'primary'(默认) | 'error' | 'warning'
 *   onConfirm   - 确认回调
 *   onCancel    - 取消回调（点击取消或关闭对话框时触发）
 *   onClose     - 可选，确认后自动关闭（默认调用 onCancel）
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  severity = 'primary',
  onConfirm,
  onCancel,
  onClose,
}) {
  const handleClose = () => {
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
    // 确认后自动关闭（如果提供了 onClose）
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle
        sx={{
          fontFamily: typography.fontFamily.mono,
          fontWeight: 600,
          color: severity === 'error' ? colors.status.error : colors.accent.blue,
          borderBottom: `1px solid ${colors.border.default}`,
          pb: 2,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <DialogContentText
          sx={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          borderTop: `1px solid ${colors.border.default}`,
        }}
      >
        <Button
          onClick={onCancel ?? handleClose}
          sx={{
            fontFamily: typography.fontFamily.mono,
            borderRadius: 0,
          }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={severity}
          onClick={handleConfirm}
          sx={{
            fontFamily: typography.fontFamily.mono,
            borderRadius: 0,
            fontWeight: 600,
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
