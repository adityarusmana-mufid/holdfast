import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    const text = this.add.text(512, 384, 'Holdfast — Game', {
      fontSize: '32px',
      color: '#e94560',
      fontFamily: 'monospace',
    })
    text.setOrigin(0.5)
  }
}
