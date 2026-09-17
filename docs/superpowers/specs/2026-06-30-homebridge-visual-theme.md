# HomeBridge Visual Theme — Portal 2 + Arknights Particle Hybrid

> **Date:** 2026-06-30
> **Branch:** `feat/styling-retheme`
> **Status:** Approved design, pending implementation

## Color Palette

Four-color system (no navy, no oceanic, no military tones):

| Role | Name | Hex | RGB | Source |
|------|------|-----|-----|--------|
| Primary accent | Tech Orange | `#FF6A00` | `(255,106,0)` | Portal 2 orange portal gun |
| Secondary accent | Tech Blue | `#1877F2` | `(24,119,242)` | Meta logo classic FB blue |
| Dark text / wireframes | Dark Grey | `#1A1A1A` | `(26,26,26)` | High-contrast readability |
| Background surface | Off-White | `#F5F5F5` | `(245,245,245)` | Arknights onboarding style |

## Visual Direction

- **Primary reference:** Arknights official website onboarding page (particle effects on light canvas)
- **Secondary reference:** Portal 2 "Clean" aesthetic — sterile, geometric, restrained
- **Vibe:** Command terminal in a clean research facility. Sharp, no rounded corners. The icosahedron is a holographic projection, not a physical object.

## Composition — HomeBridgeScene

```
Layer stack (back to front):

  [0] Off-white gradient background (F5F5F5 → slightly darker F0F0F0)
  [1] Smoke ambient — 5-8 soft blobs, cool white tint, 0.08 alpha, slow drift
  [2] Grid background — subtle tech grid, dark grey at 0.015 alpha
  [3] Icosahedron — dark grey wireframe, 12 vertices, 30 edges, auto-rotating
  [4] Fireflies — 15-20 warm orange dots, floating upward
  [5] "HOLDFAST" title — dark grey, animated in from left
  [6] Tech orange accent line below title
  [7] Buttons — TERMINAL (orange), SQUAD/EDITOR (blue), staggered entry
  [8] Mouse parallax — subtle offset on icosahedron container only
```

## Component Details

### Icosahedron (`src/effects/Icosahedron.ts`)
- 12 vertices: `(0, ±1, ±φ), (±1, ±φ, 0), (±φ, 0, ±1)` where φ = (1+√5)/2
- Normalized + scaled to radius 180px
- Rotation: 4°/s on Y axis, 1°/s on X axis, applied each frame
- Perspective projection: `screenX = v.x / (v.z + 400) * 400 + centerX`
- Wireframe: 30 edges, dark grey `#1A1A1A`, line width 1.5px, alpha 0.5
- Vertices: 12 points, tech orange `#FF6A00`, 4px radius circles, alpha 0.8
- Fade-in: 1200ms tween, alpha 0→1
- Position: center-left `(~280, ~340)`

### Fireflies (`src/effects/FireflyEffect.ts`)
- 15-20 sprites using `firefly.png` texture
- Size: 4-6px, random initial position
- Warm orange tint: `#FF8C00` with alpha 0.6 fading to 0
- Drift: upward at 0.3-0.5 px/frame, sinusoidal horizontal drift `sin(time * 0.5 + offset) * 20`
- Lifecycle: random delay spawns, fade in → drift → fade out → respawn
- Depth: 15 (above background, below title)

### Smoke Ambient (`src/effects/SmokeAmbient.ts`)
- 5-8 sprites using `smoke-texture.png`
- Cool white tint, alpha 0.08-0.12 (barely visible)
- Scale: 80-120px, slow rotation 0.002 rad/frame
- Drift: upward at 0.1 px/frame
- Depth: 1 (behind grid bg)
- Simple tweens, no RenderTexture needed

### Mouse Parallax (`src/effects/MouseParallax.ts`)
- Wraps a Phaser Container, applies offset based on mouse position
- `offsetX = (mouseX - centerX) / centerX * 15`, same for Y
- Lerp: `current += (target - current) * 0.05` on each update
- Applied as `container.setPosition(baseX + offsetX, baseY + offsetY)`
- Only on icosahedron container, not on UI buttons or title

## Asset Files

Copied from `arknights-particle` repo (GPL-3.0 textures, generic enough to reuse):

| Source File | Destination | Usage |
|-------------|-------------|-------|
| `firefly.5ec707a0de1eca4a0765.png` | `src/assets/firefly.png` | Firefly sprites |
| `particle.7ff7f9a6de6e31926ddb.png` | `src/assets/particle.png` | Reserved for future pixel-sampled logo system |
| `smoke-texture.90db6d47c9dcb188bccb.png` | `src/assets/smoke-texture.png` | Smoke ambient blobs |

## Constants Changes (`src/ui/Constants.ts`)

```typescript
// Add to COLOR_SHADE
techOrange: 0xFF6A00,
techBlue: 0x1877F2,

// Update panel bg to off-white
COLORS.panel.bg = 0xF5F5F5

// Keep text colors for dark-on-light contrast
COLORS.text.primary = '#1A1A1A'
COLORS.text.secondary = '#4B5563'
COLORS.text.dim = '#8E9AAF'
COLORS.text.accent = '#FF6A00'
```

## Application to Other Scenes (Future)

The icosahedron + firefly effect is specific to HomeBridge. The MOUSE PARALLAX pattern is documented for reuse:
- Can wrap GameScene grid container for subtle depth-on-hover
- Can wrap chapter select cards for tilt-on-hover effect
- The `MouseParallax` helper takes any Phaser Container and base coordinates

The SMOKE AMBIENT pattern is reusable for:
- ChapterSelectScene background depth
- GameScene atmospheric effect (sandstorm, smoke on battlefield)
- LevelPreviewScene ambient layer

The FIREFLY pattern is reusable for:
- Any menu screen that needs ambient life
- GameScene particle decorations near deploy zones

## Files to Create

| File | Purpose |
|------|---------|
| `src/effects/Icosahedron.ts` | 3D icosahedron wireframe + perspective projection |
| `src/effects/FireflyEffect.ts` | Floating firefly sprites |
| `src/effects/SmokeAmbient.ts` | Ambient smoke cloud layer |
| `src/effects/MouseParallax.ts` | Mouse-driven container offset helper |
| `src/assets/firefly.png` | Firefly texture |
| `src/assets/smoke-texture.png` | Smoke texture |
| `src/assets/particle.png` | Generic particle texture (reserved) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/scenes/HomeBridgeScene.ts` | Restructure: add icosahedron, fireflies, smoke, parallax; recolor buttons; new bg |
| `src/ui/Constants.ts` | Add techOrange, techBlue colors |
| `src/scenes/BootScene.ts` | Add preload step for 3 PNG assets |
