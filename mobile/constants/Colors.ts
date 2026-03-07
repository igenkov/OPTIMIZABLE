export const Colors = {
  bg:          '#0e0e0e',
  bg2:         '#141414',
  bg3:         '#1a1a1a',
  bg4:         '#1f1f1f',
  green:       '#00E676',
  greenDim:    'rgba(0,230,118,0.12)',
  greenGlow:   'rgba(0,230,118,0.35)',
  gold:        '#FFB300',
  goldDim:     'rgba(255,179,0,0.12)',
  red:         '#FF5252',
  redDim:      'rgba(255,82,82,0.12)',
  white:       '#FFFFFF',
  gray1:       '#E0E0E0',
  gray2:       '#9A9A9A',
  gray3:       '#4A4A4A',
  border:      'rgba(255,255,255,0.07)',
  borderGreen: 'rgba(0,230,118,0.25)',
} as const;

export type AppColor = keyof typeof Colors;

// Legacy export for expo-router compatibility
export default {
  light: {
    text: Colors.white,
    background: Colors.bg,
    tint: Colors.green,
    tabIconDefault: Colors.gray3,
    tabIconSelected: Colors.green,
  },
  dark: {
    text: Colors.white,
    background: Colors.bg,
    tint: Colors.green,
    tabIconDefault: Colors.gray3,
    tabIconSelected: Colors.green,
  },
};
