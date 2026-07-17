import Phaser from 'phaser'

export class SmokeAmbient {
  private sprites: Phaser.GameObjects.Image[] = []

  constructor(scene: Phaser.Scene, W: number, H: number, count: number = 6) {
    for (let i = 0; i < count; i++) {
      const s = scene.add.image(
        Math.random() * W,
        H + Math.random() * 100,
        'smoke-texture',
      )
      s.setAlpha(0.06 + Math.random() * 0.06)
      s.setScale(2 + Math.random() * 3)
      s.setTint(0xCCDDFF)
      s.setBlendMode(Phaser.BlendModes.ADD)

      const duration = 8000 + Math.random() * 12000
      scene.tweens.add({
        targets: s,
        y: -100,
        alpha: 0,
        duration,
        ease: 'Linear',
        repeat: -1,
        delay: Math.random() * 5000,
        onRepeat: () => {
          s.x = Math.random() * W
          s.y = H + 50
          s.setAlpha(0.06 + Math.random() * 0.06)
        },
      })

      scene.tweens.add({
        targets: s,
        angle: 360,
        duration: 30000 + Math.random() * 20000,
        repeat: -1,
      })

      this.sprites.push(s)
    }
  }

  setDepth(d: number): void {
    for (const s of this.sprites) {
      s.setDepth(d)
    }
  }
}
