import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { ChapterSelectScene } from './scenes/ChapterSelectScene'
import { LevelSelectScene } from './scenes/LevelSelectScene'
import { SquadScene } from './scenes/SquadScene'
import { PickerScene } from './scenes/PickerScene'
import { EditorScene } from './scenes/EditorScene'
import { GameScene } from './scenes/GameScene'
import { ResultScene } from './scenes/ResultScene'
import { LevelPreviewScene } from './scenes/LevelPreviewScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: document.body,
  backgroundColor: '#f4f6f8',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true },
  scene: [BootScene, ChapterSelectScene, LevelSelectScene, SquadScene, PickerScene, EditorScene, GameScene, ResultScene, LevelPreviewScene],
}

const game = new Phaser.Game(config)
;(window as any).__holdfastGame = game

const fsBtn = document.getElementById('fs-btn')
if (fsBtn) {
  if (!document.fullscreenEnabled) {
    fsBtn.style.display = 'none'
  } else {
    fsBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation()
      game.scale.toggleFullscreen()
    })
  }
  game.scale.on(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, () => fsBtn.remove())
}
