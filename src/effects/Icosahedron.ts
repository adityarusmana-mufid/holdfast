import Phaser from 'phaser'

const PHI = (1 + Math.sqrt(5)) / 2

const VERTICES: [number, number, number][] = [
  [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
  [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1],
]

const EDGES: [number, number][] = [
  [0, 1], [0, 4], [0, 5], [0, 8], [0, 9],
  [1, 6], [1, 7], [1, 8], [1, 9],
  [2, 3], [2, 4], [2, 5], [2, 10], [2, 11],
  [3, 6], [3, 7], [3, 10], [3, 11],
  [4, 5], [4, 8], [4, 10],
  [5, 9], [5, 11],
  [6, 7], [6, 8], [6, 10],
  [7, 9], [7, 11],
  [8, 10],
  [9, 11],
]

export class Icosahedron {
  container: Phaser.GameObjects.Container
  private wireframe: Phaser.GameObjects.Graphics
  private points: Phaser.GameObjects.Graphics
  private verts: { x: number; y: number; z: number }[]
  private angleX = 0
  private angleY = 0
  private angleZ = 0

  constructor(
    private scene: Phaser.Scene,
    private cx: number,
    private cy: number,
    private radius: number = 180,
    private rotSpeedX: number = 0.008,
    private rotSpeedY: number = 0.004,
    private rotSpeedZ: number = 0.002,
  ) {
    const len = Math.sqrt(1 + 1 + PHI * PHI)
    this.verts = VERTICES.map(v => ({
      x: (v[0] / len) * radius,
      y: (v[1] / len) * radius,
      z: (v[2] / len) * radius,
    }))

    this.container = scene.add.container(cx, cy)
    this.wireframe = scene.add.graphics()
    this.points = scene.add.graphics()
    this.container.add([this.wireframe, this.points])
    this.container.setAlpha(0)

    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 1200,
      ease: 'Sine.easeOut',
    })

    scene.events.on('update', this.update, this)
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.update, this)
    })
  }

  setDepth(d: number): void {
    this.container.setDepth(d)
  }

  private rotate(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    let { x, y, z } = v
    let cos = Math.cos(this.angleX); let sin = Math.sin(this.angleX)
    let ny = y * cos - z * sin; let nz = y * sin + z * cos; y = ny; z = nz
    cos = Math.cos(this.angleY); sin = Math.sin(this.angleY)
    let nx = x * cos + z * sin; nz = -x * sin + z * cos; x = nx; z = nz
    cos = Math.cos(this.angleZ); sin = Math.sin(this.angleZ)
    nx = x * cos - y * sin; ny = x * sin + y * cos; x = nx; y = ny
    return { x, y, z }
  }

  private project(v: { x: number; y: number; z: number }): { sx: number; sy: number } {
    const scale = 400 / (v.z + 400)
    return { sx: v.x * scale, sy: v.y * scale }
  }

  private update(_time: number, delta: number): void {
    const dt = delta / 16
    this.angleX += this.rotSpeedX * dt
    this.angleY += this.rotSpeedY * dt
    this.angleZ += this.rotSpeedZ * dt

    const projected = this.verts.map(v => this.project(this.rotate(v)))

    this.wireframe.clear()
    this.wireframe.lineStyle(1.5, 0x1A1A1A, 0.5)
    for (const [i, j] of EDGES) {
      const a = projected[i]; const b = projected[j]
      this.wireframe.beginPath()
      this.wireframe.moveTo(a.sx, a.sy)
      this.wireframe.lineTo(b.sx, b.sy)
      this.wireframe.strokePath()
    }

    this.points.clear()
    this.points.fillStyle(0xFF6A00, 0.8)
    for (const p of projected) {
      this.points.fillCircle(p.sx, p.sy, 3)
    }
  }

  destroy(): void {
    this.scene.events.off('update', this.update, this)
    this.container.destroy()
  }
}
