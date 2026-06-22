import Phaser from 'phaser'

const KINETIC = 0xcfd8dc
const THERMAL = 0xff6f00
const TRUE = 0xffffff

function projColor(damageType: string): number {
  if (damageType === 'thermal') return THERMAL
  if (damageType === 'true') return TRUE
  return KINETIC
}

export function spawnProjectile(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  target: { x: number; y: number; alive: boolean },
  damageType: string,
  duration: number,
): { cancel: () => void } {
  const color = projColor(damageType)
  const size = damageType === 'true' ? 2 : 4
  const proj = scene.add.graphics()
  proj.fillStyle(color, 1)

  if (damageType === 'thermal') {
    const s = size * 0.7
    proj.fillPoints([new Phaser.Geom.Point(0, -size), new Phaser.Geom.Point(s, 0), new Phaser.Geom.Point(0, size), new Phaser.Geom.Point(-s, 0)], true)
    proj.fillStyle(0xffffff, 0.5)
    proj.fillCircle(0, 0, 2)
  } else if (damageType === 'true') {
    proj.fillRect(-size, -1, size * 2, 2)
    proj.fillStyle(0xffffff, 0.3)
    proj.fillRect(-size - 2, -2, size * 2 + 4, 1)
  } else {
    proj.fillCircle(0, 0, size)
    proj.fillStyle(0xffffff, 0.5)
    proj.fillCircle(0, 0, size * 0.5)
  }

  proj.setPosition(fromX, fromY)
  proj.setDepth(30)

  let cancelled = false
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: duration * 1000,
    ease: 'Linear',
    onUpdate: (t) => {
      if (cancelled) return
      const p = t.getValue()
      if (p === null) return
      proj.setPosition(
        fromX + (target.x - fromX) * p,
        fromY + (target.y - fromY) * p,
      )
    },
    onComplete: () => {
      if (!cancelled) {
        const hit = scene.add.graphics()
        hit.fillStyle(color, 0.4)
        hit.fillCircle(target.x, target.y, 6)
        hit.setDepth(30)
        scene.tweens.add({ targets: hit, alpha: 0, duration: 80, onComplete: () => hit.destroy() })
      }
      proj.destroy()
    },
  })

  return { cancel: () => { cancelled = true; proj.destroy() } }
}

export function playSwing(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  targetX: number,
  targetY: number,
  speed: number,
): void {
  const duration = 150 / speed
  const angle = Math.atan2(targetY - (container.y || 0), targetX - (container.x || 0))
  scene.tweens.add({
    targets: container,
    scaleX: 1.15,
    scaleY: 1.15,
    angle: Phaser.Math.RadToDeg(angle) * 0.15,
    duration,
    ease: 'Quad.easeOut',
    yoyo: true,
    onComplete: () => {
      container.setScale(1)
      container.setAngle(0)
    },
  })
}

export function showWindUp(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  duration: number,
  speed: number,
): { cancel: () => void } {
  const indicator = scene.add.graphics()
  indicator.fillStyle(0xff0000, 0.15)
  indicator.fillCircle(0, 0, 24)
  indicator.lineStyle(2, 0xff0000, 0.6)
  indicator.strokeCircle(0, 0, 24)
  container.add(indicator)

  const pulseDur = (duration * 1000) / 4
  scene.tweens.add({
    targets: indicator,
    alpha: { from: 1, to: 0.3 },
    duration: pulseDur,
    yoyo: true,
    repeat: -1,
  })

  return {
    cancel: () => { if (indicator.active) indicator.destroy() },
  }
}

export function flashDamage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
): void {
  const f = scene.add.graphics()
  f.fillStyle(color, 0.3)
  f.fillCircle(x, y, 4)
  f.setDepth(30)
  scene.tweens.add({
    targets: f,
    alpha: 0,
    scaleX: 3,
    scaleY: 3,
    duration: 120,
    onComplete: () => f.destroy(),
  })
}
