const FONT_FAMILY = '"Share Tech Mono", "Roboto Mono", monospace'

export const FONT_SIZE = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
}

export const FONTS = {
  body: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY },
  bodyBold: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  small: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY },
  h4: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  h3: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  h2: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
}

export const SPACING = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  panelX: 10,
  btnW: 140,
  btnH: 30,
  paletteBtnH: 36,
  tileSize: 64,
}

export const COLOR_SHADE = {
  primary: { 500: 0x00a2ff, 600: 0x0091e6, 700: 0x007acc },
  success: { 500: 0x00c853, 600: 0x00b34a, 700: 0x009e41 },
  danger: { 500: 0xd32f2f, 600: 0xbd2a2a, 700: 0xa72525 },
  neutral: { 100: 0xf4f6f8, 200: 0xe8ecf0, 300: 0xd5dbe3, 400: 0xccd0d6, 500: 0x8a8a9a, 600: 0x4a4a5a, 700: 0x1a1a2e },
}

export const COLORS = {
  panel: { bg: 0xf0f2f5, border: COLOR_SHADE.primary[500], header: COLOR_SHADE.primary[500] },
  palette: {
    floor: 0xebeff5,
    wall: 0xd5dbe3,
    route: 0xdce3ed,
    deployGround: 0xd4edda,
    deployRanged: 0xd4e4ed,
    spawn: 0xf5d4d4,
    goal: 0xd4f5de,
  },
  text: {
    primary: '#1a1a2e',
    secondary: '#4a4a5a',
    dim: '#8a8a9a',
    accent: '#00a2ff',
    success: '#00c853',
    warning: '#ff9100',
    danger: '#d32f2f',
  },
  bg: COLOR_SHADE.neutral[100],
  button: { bg: 0xffffff, hover: COLOR_SHADE.primary[500], active: COLOR_SHADE.primary[600], border: COLOR_SHADE.primary[500] },
  damage: { kinetic: '#1a1a2e', thermal: '#9c27b0' },
}

export function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
