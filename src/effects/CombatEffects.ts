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

export function spawnChainBolt(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: number,
  duration: number,
): void {
  const g = scene.add.graphics()
  g.setDepth(30)

  const base = scene.add.graphics()
  base.lineStyle(5, 0xffffff, 0.35)
  base.beginPath()
  base.moveTo(fromX, fromY)
  base.lineTo(toX, toY)
  base.strokePath()
  base.setDepth(29)

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: duration * 1000,
    ease: 'Quad.easeOut',
    onUpdate: (t) => {
      const p = t.getValue()
      if (p === null) return
      g.clear()
      g.lineStyle(3.5, color, 0.9 * (1 - p * 0.5))

      const segments = 8
      const dx = (toX - fromX) / segments
      const dy = (toY - fromY) / segments
      const segLen = Math.sqrt(dx * dx + dy * dy)
      const jitter = Math.min(14, segLen * 0.5)

      g.beginPath()
      g.moveTo(fromX, fromY)
      for (let i = 1; i < segments; i++) {
        const t0 = i / segments
        const bx = fromX + (toX - fromX) * t0 + (Math.random() - 0.5) * jitter * (1 - p * 0.5)
        const by = fromY + (toY - fromY) * t0 + (Math.random() - 0.5) * jitter * (1 - p * 0.5)
        g.lineTo(bx, by)
      }
      g.lineTo(toX, toY)
      g.strokePath()
    },
    onComplete: () => { g.destroy(); base.destroy() },
  })
}

export function spawnSplashRing(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  radiusPx: number,
  color: number,
): void {
  const g = scene.add.graphics()
  g.setDepth(30)
  const fill = scene.add.graphics()
  fill.setDepth(29)

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 400,
    ease: 'Quad.easeOut',
    onUpdate: (t) => {
      const p = t.getValue()
      if (p === null) return
      const r = radiusPx * p
      g.clear()
      g.lineStyle(3, color, 0.7 * (1 - p * 0.7))
      g.strokeCircle(cx, cy, r)

      fill.clear()
      fill.fillStyle(color, 0.08 * (1 - p))
      fill.fillCircle(cx, cy, r)
    },
    onComplete: () => { g.destroy(); fill.destroy() },
  })
}

export function spawnBurstParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number = 6,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const dist = 20 + Math.random() * 20
    const g = scene.add.graphics()
    g.fillStyle(color, 0.8)
    g.fillCircle(0, 0, 2 + Math.random() * 2)
    g.setPosition(x, y)
    g.setDepth(30)
    scene.tweens.add({
      targets: g,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 300 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    })
  }
}

export function spawnExpandRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  maxRadius: number = 24,
  duration: number = 300,
): void {
  const g = scene.add.graphics()
  g.setDepth(28)
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration,
    ease: 'Quad.easeOut',
    onUpdate: (t) => {
      const p = t.getValue()
      if (p === null) return
      g.clear()
      g.lineStyle(2, color, 0.5 * (1 - p))
      g.strokeCircle(x, y, maxRadius * p)
    },
    onComplete: () => g.destroy(),
  })
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
