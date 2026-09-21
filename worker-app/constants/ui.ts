// worker-app/constants/ui.ts

export const UI = {
  splashDuration: 2000,

  colors: {
    primary: '#0B1F33',
    secondary: '#0F766E',
    accent: '#F28C28',

    background: '#F6F8FA',
    surface: '#FFFFFF',

    text: '#0B1F33',
    textSecondary: '#667085',
    textMuted: '#98A2B3',

    border: '#E5E7EB',
    inputBorder: '#D9DEE5',

    success: '#166534',
    successBackground: '#ECFDF3',

    warning: '#92400E',
    warningBackground: '#FFFBEB',

    error: '#B42318',
    errorBackground: '#FEF3F2',

    info: '#1E3A8A',
    infoBackground: '#EFF6FF',

    disabled: '#98A2B3',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },

  typography: {
    caption: 11,
    small: 12,
    body: 14,
    bodyLarge: 16,
    subtitle: 18,
    title: 24,
    largeTitle: 28,
  },

  sizes: {
    buttonHeight: 52,
    inputHeight: 52,
    headerHeight: 56,
    tabBarHeight: 64,
  },
} as const