/**
 * StaffEra Stitch design tokens — premium_service_logic / DESIGN.md
 * UX tuned for Indian households: trust (indigo), warmth (tertiary orange), clarity (₹, verified)
 */
export const Stitch = {
  colors: {
    background: '#fcf8ff',
    surface: '#fcf8ff',
    surfaceLow: '#f5f2fb',
    surfaceContainer: '#f0ecf5',
    surfaceContainerHigh: '#eae7f0',
    surfaceHighest: '#ffffff',
    onBackground: '#1b1b21',
    onSurfaceVariant: '#464652',
    outline: '#777683',
    outlineVariant: '#c7c5d4',
    primary: '#15157d',
    primaryContainer: '#2e3192',
    primaryFixed: '#e1e0ff',
    onPrimary: '#ffffff',
    secondary: '#7d44a4',
    secondaryContainer: '#d697fe',
    secondaryFixed: '#f4daff',
    tertiary: '#491a00',
    tertiaryContainer: '#6c2a00',
    tertiaryFixed: '#ffdbcb',
    onTertiaryContainer: '#f19160',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    success: '#0d9488',
    successBg: 'rgba(13, 148, 136, 0.12)',
    gradientStart: '#662D8C',
    gradientEnd: '#ED1E79',
    shadowTint: 'rgba(46, 49, 146, 0.08)',
    shadowGlow: 'rgba(237, 30, 121, 0.25)',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  spacing: {
    unit: 8,
    gutter: 16,
    padding: 24,
    section: 40,
  },
  typography: {
    display: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -0.5 },
    headline: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
    title: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    label: { fontSize: 14, fontWeight: '600' as const },
    caption: { fontSize: 12, fontWeight: '500' as const },
  },
  copy: {
    trustLine: 'Verified helpers · Secure payments · Support in English & Hindi',
    safeData: 'Your home details stay private and encrypted.',
    rupee: '₹',
  },
};

export const StatusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(241, 145, 96, 0.2)', text: '#6c2a00' },
  CONFIRMED: { bg: 'rgba(157, 161, 255, 0.25)', text: '#15157d' },
  ACTIVE: { bg: Stitch.colors.successBg, text: Stitch.colors.success },
  COMPLETED: { bg: Stitch.colors.surfaceContainer, text: Stitch.colors.onSurfaceVariant },
  EXPIRED: { bg: 'rgba(120, 120, 128, 0.18)', text: '#5c5c66' },
  CANCELLED: { bg: Stitch.colors.errorContainer, text: Stitch.colors.error },
  REJECTED: { bg: Stitch.colors.errorContainer, text: Stitch.colors.error },
  VERIFIED: { bg: Stitch.colors.successBg, text: Stitch.colors.success },
};
