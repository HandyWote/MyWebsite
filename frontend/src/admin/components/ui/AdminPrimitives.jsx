import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { colors, spacing, typography } from '@/components/pixel';

const resolveAdminPageMaxWidth = (maxWidth) => {
  if (maxWidth === false) return 'none';
  if (maxWidth === 'md') return 900;
  return 1200;
};

export function AdminPage({ title, subtitle, actions, children, maxWidth = 'lg', sx }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: resolveAdminPageMaxWidth(maxWidth),
        mx: 'auto',
        ...sx,
      }}
    >
      {(title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 3,
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant="h4" sx={{ fontFamily: typography.fontFamily.mono }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
      )}
      {children}
    </Box>
  );
}

export function AdminSection({ icon, title, subtitle, actions, children, spacing: gap = 2.5, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap,
        borderColor: colors.border.default,
        ...sx,
      }}
    >
      {(icon || title || subtitle || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}>
            {icon && <Box sx={{ mt: 0.5, flexShrink: 0 }}>{icon}</Box>}
            <Box sx={{ minWidth: 0 }}>
              {title && <Typography variant="h6">{title}</Typography>}
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
      )}
      {children}
    </Paper>
  );
}

export function AdminFormStack({ children, spacing: gap = 2.5, sx }) {
  return (
    <Stack spacing={gap} sx={sx}>
      {children}
    </Stack>
  );
}

export function AdminFieldGrid({ children, spacing: gap = 2.5, sx }) {
  return (
    <Grid container spacing={gap} sx={sx}>
      {children}
    </Grid>
  );
}

export function AdminFieldGridItem({ children, size = { xs: 12 }, sx }) {
  return (
    <Grid size={size} sx={sx}>
      {children}
    </Grid>
  );
}

const mergeSlotProps = (slotProps, slot, value) => ({
  ...slotProps,
  [slot]: {
    ...value,
    ...(slotProps?.[slot] || {}),
    sx: {
      ...(value?.sx || {}),
      ...(slotProps?.[slot]?.sx || {}),
    },
  },
});

export function AdminTextField({ slotProps, fullWidth = true, ...props }) {
  const mergedSlotProps = mergeSlotProps(slotProps, 'formHelperText', {
    sx: {
      mt: 0.75,
      ml: 0,
      minHeight: props.helperText ? '1.25em' : 0,
    },
  });

  return (
    <TextField
      fullWidth={fullWidth}
      variant="outlined"
      slotProps={mergedSlotProps}
      {...props}
    />
  );
}

export function AdminSelect({
  label,
  value,
  onChange,
  children,
  fullWidth = true,
  formControlProps,
  selectProps,
}) {
  return (
    <FormControl fullWidth={fullWidth} {...formControlProps}>
      {label && <InputLabel>{label}</InputLabel>}
      <Select value={value} label={label} onChange={onChange} {...selectProps}>
        {children}
      </Select>
    </FormControl>
  );
}

AdminSelect.Item = MenuItem;

export function AdminStatsGrid({ children, spacing: gap = 2, sx }) {
  return (
    <Grid container spacing={gap} sx={sx}>
      {children}
    </Grid>
  );
}

export function AdminEmptyState({ title = '暂无数据', description, children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 3, md: 4 },
        textAlign: 'center',
        borderColor: colors.border.default,
        ...sx,
      }}
    >
      <Typography variant="body1" color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      )}
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Paper>
  );
}

export function AdminDialogSection({ icon, title, subtitle, children, sx }) {
  return (
    <AdminSection icon={icon} title={title} subtitle={subtitle} spacing={2.5} sx={sx}>
      {children}
    </AdminSection>
  );
}

export const adminUiSpacing = spacing;
