import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { PixelButton } from '../pixelProps';
import { colors, typography, borders, spacing } from '../../../components/pixel/tokens';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - 捕获子组件渲染错误的防御层
 * React 要求 error boundary 必须是 class 组件
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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

            <PixelButton
              variant="outline"
              onClick={this.handleRetry}
              sx={{
                color: colors.accent.blue,
                borderColor: colors.border.accent,
                '&:hover': {
                  borderColor: colors.accent.blue,
                  bgcolor: colors.interactive.hover,
                },
              }}
            >
              Retry
            </PixelButton>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
