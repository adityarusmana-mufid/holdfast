const FONT_FAMILY = '"Share Tech Mono", "Roboto Mono", monospace'
const FONT_SERIF = 'Georgia, "Times New Roman", serif'

export const FONT_SIZE = {
  xs: '14px',
  sm: '16px',
  base: '18px',
  lg: '20px',
  xl: '24px',
  '2xl': '28px',
  '3xl': '36px',
}

export const FONTS = {
  body: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY },
  bodyBold: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  small: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY },
  h4: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  h3: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  h2: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  h1: { fontSize: FONT_SIZE['3xl'], fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  serif: { fontSize: FONT_SIZE.xl, fontFamily: FONT_SERIF },
  serifH2: { fontSize: FONT_SIZE['2xl'], fontFamily: FONT_SERIF, fontStyle: 'bold' },
}

export { FONT_SERIF }

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
  btnH: 44,
  paletteBtnH: 36,
  tileSize: 64,
}

export const COLOR_SHADE = {
  primary: { 500: 0x0004EB, 600: 0x0000A8, 700: 0x000066 },
  success: { 500: 0x00c853, 600: 0x00b34a, 700: 0x009e41 },
  danger: { 500: 0xd32f2f, 600: 0xbd2a2a, 700: 0xa72525 },
  neutral: { 100: 0x0D0D30, 200: 0x0A0A28, 300: 0x080820, 400: 0x060618, 500: 0x6B7280, 600: 0x8A8A9A, 700: 0x05001A },
}

export const COLORS = {
  panel: { bg: 0x0D0D30, border: COLOR_SHADE.primary[500], header: COLOR_SHADE.primary[500] },
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
    primary: '#ffffff',
    secondary: '#b0b8c8',
    dim: '#6B7280',
    accent: '#4488FF',
    success: '#00c853',
    warning: '#ff9100',
    danger: '#d32f2f',
  },
  bg: 0x05001A,
  button: { bg: 0x0004EB, hover: 0x0004EB, active: 0x0000A8, border: 0x0004EB },
  nodeButton: {
    defaultTop: 0x1A1A3E,
    defaultBottom: 0x0D0D30,
    defaultTopPressed: 0x0D0D30,
    defaultBottomPressed: 0x05001A,
    primaryTop: 0x0004EB,
    primaryBottom: 0x0000A8,
    primaryTopPressed: 0x0000A8,
    primaryBottomPressed: 0x000066,
    dangerTop: 0x5a2020,
    dangerBottom: 0x3a1010,
    dangerTopPressed: 0x4a1818,
    dangerBottomPressed: 0x2a0c0c,
  },
  damage: { kinetic: '#1a1a2e', thermal: '#9c27b0' },
}

export function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
