// Design tokens from the Axiom AI design system.
export const palette = {
  indigo: '#4F46E5', lavender: '#A78BFA', periwinkle: '#60A5FA', pink: '#F472B6', slate: '#64748B', ivory: '#F8FAFC'
} as const;

export const lightColors = {
  bg: '#EEF0FA', surface: '#FFFFFF', surfaceAlt: '#F4F5FC', border: '#E2E5F3', text: '#16183A', muted: '#64748B',
  primary: palette.indigo, primaryText: '#FFFFFF', accent: palette.lavender, info: palette.periwinkle, highlight: palette.pink,
  userBubble: '#EEF0FF', botBubble: '#FFFFFF', sidebar: '#161733', sidebarText: '#E6E8FF', sidebarMuted: '#9AA0D0', sidebarActive: '#26284F',
  success: '#16A34A', successBg: '#DCFCE7', danger: '#DC2626', dangerBg: '#FEE2E2', warning: '#D97706', overlay: 'rgba(10,12,40,0.5)'
};
export type Colors = { [K in keyof typeof lightColors]: string };
export const darkColors: Colors = {
  ...lightColors, bg: '#0E0F26', surface: '#17183A', surfaceAlt: '#1E2048', border: '#2B2D5A', text: '#ECEEFF', muted: '#9AA3C7',
  primary: '#7C74F5', userBubble: '#2A2C6B', botBubble: '#17183A', sidebar: '#0A0B1E', sidebarActive: '#1E2048',
  successBg: '#0F3A24', dangerBg: '#4A1515'
};

export const gradient = ['#5B52F0', '#A78BFA', '#F472B6'] as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 } as const;
export const breakpoints = { tablet: 768, desktop: 1100 } as const;
