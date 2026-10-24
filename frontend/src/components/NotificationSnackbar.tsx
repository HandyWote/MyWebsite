import { Alert, Snackbar } from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';

export interface NotificationSnackbarProps {
  /** 是否展示（受控，来自 useNotification 的 open）。 */
  open: boolean;
  /** 展示文案。 */
  message: string;
  /** 级别：与 MUI Alert severity 一致（默认 info）。 */
  severity?: AlertColor;
  /** 关闭回调（自动隐藏、手动关闭都会触发）。 */
  onClose: () => void;
  /** 自动隐藏毫秒数（默认 3000）。 */
  autoHideDuration?: number;
}

export default function NotificationSnackbar({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 3000,
}: NotificationSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
