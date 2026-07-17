import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.load.image('firefly', 'assets/firefly.png')
    this.load.image('particle', 'assets/particle.png')
    this.load.image('smoke-texture', 'assets/smoke-texture.png')
  }

  create(): void {
    this.scene.start('HomeBridgeScene')
  }
}
