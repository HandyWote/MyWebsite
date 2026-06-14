import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { colors, typography, borders, spacing } from '../../../components/pixel/tokens';

/**
 * ErrorBoundary - 捕获子组件渲染错误的防御层
 * React 要求 error boundary 必须是 class 组件
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: colors.bg.primary,
            p: spacing.lg,
          }}
        >
          <Box
            sx={{
              maxWidth: 480,
              border: `${borders.emphasis} ${colors.border.accent}`,
              bgcolor: colors.bg.secondary,
              p: spacing.xl,
            }}
          >
            <Typography
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.lg,
                color: colors.accent.blue,
                mb: 2,
              }}
            >
              {'> SYSTEM ERROR'}
            </Typography>

            <Typography
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.md,
                color: colors.status.error,
                mb: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || 'An unknown error occurred'}
            </Typography>

            <Typography
              sx={{
                fontFamily: typography.fontFamily.mono,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                mb: 3,
              }}
            >
              Something went wrong. Please try again or contact the administrator.
            </Typography>

            <Button
              variant="outlined"
              onClick={this.handleRetry}
              sx={{
                fontFamily: typography.fontFamily.mono,
                color: colors.accent.blue,
                borderColor: colors.border.accent,
                borderRadius: 0,
                '&:hover': {
                  borderColor: colors.accent.blue,
                  bgcolor: colors.interactive.hover,
                },
              }}
            >
              Retry
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
