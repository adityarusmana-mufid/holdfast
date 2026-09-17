import Phaser from 'phaser'

export class MouseParallax {
  private currentX = 0
  private currentY = 0

  constructor(
    scene: Phaser.Scene,
    private container: Phaser.GameObjects.Container,
    private baseX: number,
    private baseY: number,
    private intensity: number = 15,
    private lerpSpeed: number = 0.05,
  ) {
    scene.events.on('update', this.update, this)
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.update, this)
    })

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cx = scene.scale.width / 2
      const cy = scene.scale.height / 2
      this.currentX = ((p.x - cx) / cx) * this.intensity
      this.currentY = ((p.y - cy) / cy) * this.intensity
    })
  }

  private update(): void {
    const dx = (this.baseX + this.currentX - this.container.x) * this.lerpSpeed
    const dy = (this.baseY + this.currentY - this.container.y) * this.lerpSpeed
    this.container.x += dx
    this.container.y += dy
  }
}
