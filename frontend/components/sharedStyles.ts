/*
 * frontend/components/sharedStyles.ts - 共用樣式與佈局變數。
 */
import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1E222B',
  leftPanel: '#161920',
  control: '#2A2F35',
  card: '#32383E',
  primary: '#5A8B73',
  secondary: '#4A7561',
  alert: '#F06E6E',
  border: '#3E444A',
  text: '#FFFFFF',
  muted: '#999999',
  subtle: '#AAA',
  subMuted: '#888888',
  notificationBg: '#2B3136',
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 30,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 16,
};

export const typography = {
  h1: 20,
  h2: 18,
  body: 14,
  small: 12,
  large: 32,
};

export const shared = StyleSheet.create({
  panel: {
    backgroundColor: colors.leftPanel,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.md,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});

export default { colors, spacing, radii, typography, shared };
