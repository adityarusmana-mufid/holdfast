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
  primary: { 500: 0x0040FF, 600: 0x0030CC, 700: 0x002099 },
  techOrange: { 500: 0xFF6A00, 600: 0xE05E00, 700: 0xC04F00 },
  techBlue: { 500: 0x1877F2, 600: 0x1468D4, 700: 0x1057B4 },
  success: { 500: 0x00c853, 600: 0x00b34a, 700: 0x009e41 },
  danger: { 500: 0xd32f2f, 600: 0xbd2a2a, 700: 0xa72525 },
  neutral: { 100: 0xF4F7FA, 200: 0xE8EDF2, 300: 0xD5DBE3, 400: 0xCCD0D6, 500: 0x8E9AAF, 600: 0x4B5563, 700: 0x1A1A1A },
}

export const COLORS = {
  panel: { bg: 0xE8EDF2, border: COLOR_SHADE.primary[500], header: COLOR_SHADE.primary[500] },
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
    primary: '#0A0A0C',
    secondary: '#4B5563',
    dim: '#8E9AAF',
    accent: '#0040FF',
    success: '#00c853',
    warning: '#ff9100',
    danger: '#d32f2f',
  },
  bg: COLOR_SHADE.neutral[100],
  button: { bg: 0x0040FF, hover: 0x0030CC, active: 0x002099, border: 0x0040FF },
  nodeButton: {
    defaultTop: 0x0A0A0C,
    defaultBottom: 0x000000,
    defaultTopPressed: 0x000000,
    defaultBottomPressed: 0x0A0A0C,
    primaryTop: 0x0040FF,
    primaryBottom: 0x0030CC,
    primaryTopPressed: 0x0030CC,
    primaryBottomPressed: 0x002099,
    dangerTop: 0x5a2020,
    dangerBottom: 0x3a1010,
    dangerTopPressed: 0x4a1818,
    dangerBottomPressed: 0x2a0c0c,
  },
  damage: { kinetic: '#0A0A0C', thermal: '#9c27b0' },
}

export const CORNER_BRACKET_SIZE = 16

export const BUTTON_BEVEL = 0.08

export const BORDER_STYLE = {
  subtle: 0x0040FF,
  subtleAlpha: 0.08,
  hover: 0x0040FF,
  hoverAlpha: 0.18,
  active: 0x0040FF,
  activeAlpha: 0.35,
}

export const GRID_BG = {
  spacing: 40,
  color: 0x0040FF,
  alpha: 0.015,
}

export const TOP_BAR = 64

export const SIDEBAR_W = 280

export function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
