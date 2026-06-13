export const COLORS = {
  panel: { bg: 0xf0f2f5, border: 0x00a2ff, header: 0x00a2ff },
  palette: {
    floor: 0xebeff5,
    wall: 0xd5dbe3,
    route: 0xdce3ed,
    deployGround: 0xd4edda,
    deployRanged: 0xd4e4ed,
    spawn: 0xf5d4d4,
    goal: 0xd4f5de,
  },
  text: { primary: '#1a1a2e', secondary: '#4a4a5a', dim: '#8a8a9a', accent: '#00a2ff', success: '#00c853', warning: '#ff9100', danger: '#d32f2f' },
  bg: 0xf4f6f8,
  button: { bg: 0xffffff, hover: 0xe8f0fe, active: 0xd0e4fc, border: 0x00a2ff },
  damage: { kinetic: '#1a1a2e', thermal: '#9c27b0' },
}

export const FONTS = {
  body: { fontSize: '13px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace' },
  bodyBold: { fontSize: '13px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold' },
  small: { fontSize: '12px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace' },
  h4: { fontSize: '13px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold' },
  h3: { fontSize: '15px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold' },
  h2: { fontSize: '17px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace', fontStyle: 'bold' },
}

export const SPACING = {
  panelX: 10,
  btnW: 140,
  btnH: 30,
  paletteBtnH: 36,
  gridOffsetX: 160,
  gridOffsetY: 32,
  tileSize: 64,
}

export function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
