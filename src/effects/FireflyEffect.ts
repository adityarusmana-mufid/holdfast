import Phaser from 'phaser'

interface Firefly {
  sprite: Phaser.GameObjects.Image
  speed: number
  driftPhase: number
  life: number
  maxLife: number
  baseX: number
  baseY: number
}

export class FireflyEffect {
  private fireflies: Firefly[] = []
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene, private W: number, private H: number, count: number = 18) {
    this.scene = scene
    for (let i = 0; i < count; i++) {
      const x = Math.random() * W
      const y = Math.random() * H
      const sprite = scene.add.image(x, y, 'firefly')
      sprite.setAlpha(0)
      sprite.setScale(0.3 + Math.random() * 0.4)
      sprite.setTint(0xFF8C00)

      this.fireflies.push({
        sprite,
        speed: 0.2 + Math.random() * 0.3,
        driftPhase: Math.random() * Math.PI * 2,
        life: Math.random() * 300,
        maxLife: 300 + Math.random() * 200,
        baseX: x,
        baseY: y,
      })
    }

    scene.events.on('update', this.update, this)
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.update, this)
    })
  }

  setDepth(d: number): void {
    for (const f of this.fireflies) {
      f.sprite.setDepth(d)
    }
  }

  private update(): void {
    for (const f of this.fireflies) {
      f.life++

      const fadeIn = Math.min(f.life / 60, 1)
      const fadeOut = Math.max(0, (f.maxLife - f.life) / 60)
      f.sprite.setAlpha(fadeIn * fadeOut * 0.6)

      const t = f.life
      f.sprite.x = f.baseX + Math.sin(t * 0.02 + f.driftPhase) * 20
      f.sprite.y = f.baseY - f.speed * t

      if (f.life > f.maxLife) {
        f.life = 0
        f.baseX = Math.random() * this.W
        f.baseY = this.H + 20
        f.sprite.x = f.baseX
        f.sprite.y = f.baseY
      }
    }
  }
}
