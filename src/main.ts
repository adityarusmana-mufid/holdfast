import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { EditorScene } from './scenes/EditorScene'
import { GameScene } from './scenes/GameScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, EditorScene, GameScene],
}

new Phaser.Game(config)
