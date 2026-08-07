/**
 * Premium dark design-system tokens for the ubeApp.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Colour Palette ──────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Premium dark surfaces */
export const Surface = {
  base: '#0A0E21',
  card: '#141829',
  cardBorder: '#1E2240',
  input: '#1A1F36',
  inputFocused: '#222850',
  overlay: 'rgba(10, 14, 33, 0.85)',
} as const;

/** Accent gradient stops */
export const Accent = {
  primary: '#6C63FF',
  secondary: '#3F3D9E',
  gradient: ['#6C63FF', '#3F3D9E'] as const,
  buttonGradient: ['#6C63FF', '#8B5CF6', '#3F3D9E'] as const,
} as const;

/** Status colours */
export const Status = {
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.12)',
  pending: '#8B5CF6',
  pendingBg: 'rgba(139, 92, 246, 0.12)',
} as const;

/** Text colours on dark backgrounds */
export const TextColor = {
  primary: '#FFFFFF',
  secondary: '#94A3B8',
  tertiary: '#64748B',
  accent: '#8B8BFF',
  error: '#F87171',
  link: '#818CF8',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontSize = {
  hero: 32,
  title: 24,
  subtitle: 18,
  body: 16,
  caption: 14,
  small: 12,
} as const;

// ─── Spacing & Layout ────────────────────────────────────────────────────────

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
