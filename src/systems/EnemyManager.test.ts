import { describe, it, expect, vi } from 'vitest'

vi.mock('phaser', () => {
  const mockGraphics = {
    fillStyle: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    fillTriangle: vi.fn().mockReturnThis(),
    fillPoints: vi.fn().mockReturnThis(),
    strokeTriangle: vi.fn().mockReturnThis(),
    strokeCircle: vi.fn().mockReturnThis(),
    strokePoints: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    strokeRect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  }
  const mockFn = () => mockGraphics
  mockFn.mockReturnThis = vi.fn().mockReturnThis()
  return {
    default: {
      Scene: class {},
      GameObjects: {
        Graphics: class { constructor() { return mockGraphics } },
        Container: class {
          constructor() { return { setDepth: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis(), setPosition: vi.fn().mockReturnThis(), destroy: vi.fn() } }
        },
        Particles: {
          ParticleEmitter: class { constructor() { return { explode: vi.fn(), destroy: vi.fn() } } },
        },
      },
      Display: {
        Color: { GetColor: (_r: number, _g: number, _b: number) => 0 },
      },
      Geom: {
        Point: class { constructor(public x: number, public y: number) {} },
      },
    },
  }
})

import { EnemySprite } from '../entities/Enemy'
import { EnemyConfig, EnemyBehavior, TileType } from '../types/index'

function makeEnemyConfig(overrides: Partial<EnemyConfig> & { behavior: EnemyBehavior }): EnemyConfig {
  return {
    id: 'test', name: 'Test', hp: 1000, atk: 100, armor: 50, res: 0,
    speed: 60, color: 0xff0000, dpOnKill: 1, attackInterval: 2,
    damageType: 'kinetic' as const,
    ...overrides,
  }
}

function makeEnemySprite(config: EnemyConfig): EnemySprite {
  const mockScene = {
    add: {
      graphics: () => ({
        fillStyle: () => {},
        fillCircle: () => {},
        fillTriangle: () => {},
        fillPoints: () => {},
        strokeTriangle: () => {},
        strokeCircle: () => {},
        strokePoints: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        clear: () => {},
        lineStyle: () => {},
        setDepth: () => {},
        destroy: () => {},
      }),
      container: (_x: number, _y: number, _children: any[]) => ({
        setDepth: () => {},
        setAlpha: () => {},
        setPosition: () => {},
        destroy: () => {},
        scene: null,
      }),
      particles: (_x: number, _y: number, _tex: string, _cfg: any) => ({
        explode: () => {},
        destroy: () => {},
      }),
    },
    textures: { exists: () => false },
    time: { delayedCall: () => {} },
    tweens: { add: () => {} },
    make: { graphics: () => ({ fillStyle: () => {}, fillRect: () => {}, generateTexture: () => {}, destroy: () => {} }) },
  } as any

  const mockGrid = {
    rows: 5, cols: 5,
    tileToPixel: (_r: number, _c: number) => ({ x: _c * 64 + 32, y: _r * 64 + 32 }),
    pixelToTile: (_x: number, _y: number) => ({ row: Math.floor(_y / 64), col: Math.floor(_x / 64) }),
    getTile: () => ({ type: TileType.Ground, row: 0, col: 0 }),
    getFlowDirection: () => null,
    setPathSystem: () => {},
    tiles: [],
  } as any

  const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }]
  return new EnemySprite(mockScene, mockGrid, config, path)
}

describe('EnemySprite behavior', () => {
  it('has standard behavior by default from config', () => {
    const config = makeEnemyConfig({ id: 'soldier', behavior: { type: 'standard' } })
    const enemy = makeEnemySprite(config)
    expect(enemy.behavior.type).toBe('standard')
  })

  it('initializes shieldHp for shielded enemy', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', behavior: { type: 'shielded', shieldHp: 2500 } })
    const enemy = makeEnemySprite(config)
    expect(enemy.currentShieldHp).toBe(2500)
  })

  it('shield absorbs damage before HP', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', hp: 5000, behavior: { type: 'shielded', shieldHp: 1000 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(600)
    expect(enemy.currentShieldHp).toBe(400)
    expect(enemy.currentHp).toBe(5000)
  })

  it('shield overkill rolls over to HP', () => {
    const config = makeEnemyConfig({ id: 'shielded_test', hp: 5000, behavior: { type: 'shielded', shieldHp: 1000 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(1500)
    expect(enemy.currentShieldHp).toBe(0)
    expect(enemy.currentHp).toBe(4500)
  })

  it('stealth behavior type is set', () => {
    const config = makeEnemyConfig({ id: 'phantom_test', behavior: { type: 'stealth', detectionRange: 2.0 } })
    const enemy = makeEnemySprite(config)
    expect(enemy.behavior.type).toBe('stealth')
    expect(enemy.isDetected).toBe(false)
  })

  it('takeDamage sets isDetected on stealth enemy', () => {
    const config = makeEnemyConfig({ id: 'phantom_test', behavior: { type: 'stealth', detectionRange: 2.0 } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(1)
    expect(enemy.isDetected).toBe(true)
  })

  it('sets alive=false when HP reaches 0', () => {
    const config = makeEnemyConfig({ id: 'test', hp: 100, behavior: { type: 'standard' } })
    const enemy = makeEnemySprite(config)
    enemy.takeDamage(200)
    expect(enemy.alive).toBe(false)
  })
})
