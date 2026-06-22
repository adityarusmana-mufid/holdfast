import Phaser from 'phaser'
import { UnitConfig } from '../types/index'
import { EnemyConfig } from '../types/index'

export interface PixelSpriteDef {
  w: number
  h: number
  data: string[]
}

export function generateTexture(scene: Phaser.Scene, key: string, def: PixelSpriteDef): void {
  const g = scene.make.graphics()
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      if (def.data[y]?.[x] && def.data[y][x] !== '.') {
        g.fillStyle(0xffffff)
        g.fillRect(x, y, 1, 1)
      }
    }
  }
  g.generateTexture(key, def.w, def.h)
  g.destroy()
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST)
}

export type SpriteKey = 'unit_rounded' | 'unit_diamond' | 'enemy_circle'

export function unitSpriteKey(config: UnitConfig): SpriteKey {
  return config.type === 'ranged' ? 'unit_diamond' : 'unit_rounded'
}

export function enemySpriteKey(_config: EnemyConfig): SpriteKey {
  return 'enemy_circle'
}

export const SPRITE_DEFS: Record<SpriteKey, PixelSpriteDef> = {
  unit_rounded: {
    w: 14, h: 14,
    data: [
      '..RRRRRRRRRR..',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      '..RRRRRRRRRR..',
    ],
  },
  unit_diamond: {
    w: 14, h: 14,
    data: [
      '......RR......',
      '.....RRRR.....',
      '....RRRRRR....',
      '...RRRRRRRR...',
      '..RRRRRRRRRR..',
      '.RRRRRRRRRRRR.',
      'RRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRR',
      '.RRRRRRRRRRRR.',
      '..RRRRRRRRRR..',
      '...RRRRRRRR...',
      '....RRRRRR....',
      '.....RRRR.....',
      '......RR......',
    ],
  },
  enemy_circle: {
    w: 12, h: 12,
    data: [
      '..RRRRRRRR..',
      '.RRRRRRRRRR.',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      'RRRRRRRRRRRR',
      '.RRRRRRRRRR.',
      '..RRRRRRRR..',
    ],
  },
}
