import Phaser from 'phaser'
import { EnemyConfig, Wave, WaveEntry } from '../types/index'
import { Grid } from '../entities/Grid'
import { EnemySprite } from '../entities/Enemy'
import { DeploymentSystem } from './DeploymentSystem'
import { Position } from '../shared/utils/GridMath'
import { ENEMY_CONFIGS } from '../config/enemies'

export interface EnemyManagerEvents {
  onEnemyReachedObjective: (config: EnemyConfig) => void
  onEnemyKilled: (config: EnemyConfig, pos: Position) => void
}

export class EnemyManager {
  private scene: Phaser.Scene
  private grid: Grid
  private depSystem: DeploymentSystem
  private events: EnemyManagerEvents
  private enemies: EnemySprite[] = []
  private waypoints: Position[]

  private waveQueue: Wave[] = []
  private currentWave: number = -1
  private waveActive: boolean = false
  private waveSpawnIndex: number = 0
  private waveSpawnTimer: number = 0
  private waveEntryIndex: number = 0
  private allWavesComplete: boolean = false
  private battleStarted: boolean = false
  private lives: number = 3

  constructor(scene: Phaser.Scene, grid: Grid, depSystem: DeploymentSystem, waypoints: Position[], events: EnemyManagerEvents) {
    this.scene = scene
    this.grid = grid
    this.depSystem = depSystem
    this.waypoints = waypoints
    this.events = events
  }

  setWaves(waves: Wave[], lives: number = 3): void {
    this.waveQueue = [...waves]
    this.currentWave = -1
    this.lives = lives
    this.allWavesComplete = false
    this.battleStarted = false
  }

  startBattle(): void {
    this.battleStarted = true
    this.startNextWave()
  }

  private startNextWave(): void {
    this.currentWave++
    if (this.currentWave >= this.waveQueue.length) {
      this.allWavesComplete = true
      return
    }
    this.waveActive = true
    this.waveEntryIndex = 0
    this.waveSpawnIndex = 0
    this.waveSpawnTimer = 0
  }

  private spawnEnemy(config: EnemyConfig): void {
    if (this.waypoints.length < 2) return
    const enemy = new EnemySprite(this.scene, this.grid, config, this.waypoints)
    this.enemies.push(enemy)
  }

  update(delta: number): void {
    if (!this.battleStarted) return

    if (!this.allWavesComplete) {
      this.updateWaveSpawn(delta)
    }

    this.updateMovement(delta)
    this.updateBlocking()
    this.updateObjectiveCheck()
    this.removeDead()
  }

  private updateWaveSpawn(delta: number): void {
    if (!this.waveActive) return
    if (this.currentWave >= this.waveQueue.length) return

    const wave = this.waveQueue[this.currentWave]
    if (this.waveEntryIndex >= wave.entries.length) {
      this.waveActive = false
      this.startNextWave()
      return
    }

    const entry = wave.entries[this.waveEntryIndex]
    const config = ENEMY_CONFIGS.find(e => e.id === entry.enemyType)
    if (!config) { this.waveEntryIndex++; return }

    this.waveSpawnTimer += delta
    if (this.waveSpawnTimer >= entry.spawnInterval && this.waveSpawnIndex < entry.count) {
      this.spawnEnemy(config)
      this.waveSpawnIndex++
      this.waveSpawnTimer = 0
    }

    if (this.waveSpawnIndex >= entry.count) {
      this.waveEntryIndex++
      this.waveSpawnIndex = 0
      this.waveSpawnTimer = 0
    }
  }

  private updateMovement(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      enemy.move(delta)
    }
  }

  private updateBlocking(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const tile = enemy.getCurrentTile()
      if (!tile) continue
      const unit = this.depSystem.getUnitAt(tile.row, tile.col)
      if (unit && unit.config.type === 'ground' && unit.config.blockCount > 0) {
        const isAlreadyBlocked = unit.blocking.includes(enemy.id)
        if (!isAlreadyBlocked && unit.blocking.length < unit.config.blockCount) {
          unit.blocking.push(enemy.id)
          enemy.setBlocked(true, `${tile.row},${tile.col}`)
        }
      } else {
        if (enemy.blocked) {
          const unitKey = enemy.blockerUnitKey
          if (unitKey) {
            const oldUnit = this.depSystem.getUnitAt(
              parseInt(unitKey.split(',')[0]),
              parseInt(unitKey.split(',')[1]),
            )
            if (oldUnit) {
              const idx = oldUnit.blocking.indexOf(enemy.id)
              if (idx !== -1) oldUnit.blocking.splice(idx, 1)
            }
          }
          enemy.setBlocked(false)
        }
      }
    }
  }

  private updateObjectiveCheck(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      if (enemy.isAtObjective()) {
        this.lives--
        enemy.alive = false
        this.events.onEnemyReachedObjective(enemy.config)
      }
    }
  }

  private removeDead(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive && enemy.blockerUnitKey) {
        const [r, c] = enemy.blockerUnitKey.split(',').map(Number)
        const unit = this.depSystem.getUnitAt(r, c)
        if (unit) {
          const idx = unit.blocking.indexOf(enemy.id)
          if (idx !== -1) unit.blocking.splice(idx, 1)
        }
      }
    }

    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) {
        e.destroy()
        return false
      }
      return true
    })
  }

  getEnemies(): EnemySprite[] {
    return this.enemies
  }

  getLives(): number {
    return this.lives
  }

  isAllWavesComplete(): boolean {
    return this.allWavesComplete && this.enemies.length === 0
  }

  isBattleOver(): boolean {
    return this.lives <= 0 || this.isAllWavesComplete()
  }

  hasWon(): boolean {
    return this.isAllWavesComplete() && this.lives > 0
  }

  cleanup(): void {
    for (const e of this.enemies) e.destroy()
    this.enemies = []
  }
}


