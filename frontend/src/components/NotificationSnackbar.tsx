import { Alert, Snackbar } from '@mui/material';

export default function NotificationSnackbar({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 3000,
}) {
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
