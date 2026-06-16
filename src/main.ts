import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { EditorScene } from './scenes/EditorScene'
import { GameScene } from './scenes/GameScene'
import { SquadScene } from './scenes/SquadScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: document.body,
  backgroundColor: '#f4f6f8',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true },
  scene: [BootScene, SquadScene, EditorScene, GameScene],
}

new Phaser.Game(config)
