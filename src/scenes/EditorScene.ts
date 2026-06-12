import Phaser from 'phaser'

export class EditorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EditorScene' })
  }

  create(): void {
    const text = this.add.text(512, 384, 'Holdfast — Editor', {
      fontSize: '32px',
      color: '#e94560',
      fontFamily: 'monospace',
    })
    text.setOrigin(0.5)
  }
}
