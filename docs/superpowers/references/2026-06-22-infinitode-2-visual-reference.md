# Infinitode 2 — Visual & Animation Reference

**Date:** 2026-06-22
**Context:** Infinitode 2 is Holdfast's north star for visual graphics and animations (Arknights is north star for gameplay mechanics). This document catalogs how Infinitode 2 implements minimal geometric-shape visuals as a triple-A tower defense experience.

**Source:** Solo developer (Prineside), published via Steam/Mobile. ~100MB install size, 30fps lock, Java/libGDX runtime. 16 tower types, 11 enemy types, map editor, research tree, endless mode.

---

## 1. Core Visual Philosophy

### 1.1 Minimalism as Design Constraint, Not Limitation

From the developer (Prineside): *"I am a sole developer, my skills and resources are limited. Minimal graphics allow me to focus on what matters: every tower must have a use, nothing should be useless."*

The result is recognized as a visual strength, not a compromise:
- **Reviews consistently praise:** *"Minimalist graphics polished to perfection"*, *"simplistic, well optimized, tiny in size but overfilled with features"*, *"Don't let the minimalist graphics fool you into thinking this is a low effort game"*
- **Physics/particle intensity scales with combat intensity** — *"as our towers become more powerful, a pyrotechnic show of greater intensity is generated"* despite minimal shapes
- **Performance is a feature** — runs on low-end Android devices, visual effects can be fully disabled in settings

### 1.2 Camera & Rendering

- Orthographic 2D, locked at 30 FPS
- Game speed control: 1x / 2x / 3x + frame-by-frame advance via long-hold
- Multithreaded rendering option for particle-heavy scenarios
- "Clean detailed mode" — makes projectiles and particles semi-transparent so you can see the map through them
- Graphics scale slider to reduce GPU load
- CVD-friendly colors option for colorblind players

### 1.3 Shape → Meaning Mapping

| Entity | Shape | Color | Meaning |
|--------|-------|-------|---------|
| Basic tower | Small square/pedestal + rotating barrel | Gray/blue | Simple, cheap, all-rounder |
| Sniper | Tall thin tower with long barrel | Dark blue/gray | Single-target precision |
| Cannon | Short wide tower with stubby barrel | Green | Explosive AoE |
| Freezing | Hexagonal crystal base | Cyan | Slow debuff |
| Splash | Rotating hub with radial barrels | Orange | Omni-directional, no aiming |
| Multishot | Arc-shaped barrel array | Purple | Arc of projectiles |
| Minigun | Multiple rotating barrels | Red | Ramping fire rate |
| Venom | Narrow tube with drip | Green | Poison DoT |
| Tesla | Spherical coil | Yellow | Chain lightning |
| Missile | Angled launch tube | Orange | Seeking projectiles |
| Laser | Cylindrical base with emitter | Blue | Continuous beam |
| Enemies | Circles/shapes | Various | Speed/hp/behavior by color |
| Armored enemy | Shield icon overlay | Gray aura | Damage reduction aura |

Color + shape are redundant carriers of meaning — both channels encode the same information.

---

## 2. Attack Animations & Projectile System

### 2.1 Tower Rotation & Aiming

- Towers rotate to face their target at a configurable **Rotation Speed** (degrees/sec)
- Rotation speed is a tower stat affected by PWR, research, and tile bonuses
- **Sniper exception**: has explicit **Aiming Time** — once rotated to face target, waits 1s while a "narrowing angle animation" plays. Re-aims only when target changes.
- **Splash exception**: does not aim. Fires omnidirectionally in a counterclockwise rotation. Attack speed determines revolutions/sec. Projectile count determines density.
- **Minigun exception**: barrel spins up over time — attack speed accelerates while firing, decelerates while idle. Visual: barrel rotation speed matches fire rate.
- **Laser exception**: no rotation during firing — beam is a static line. Some abilities allow limited rotation.

### 2.2 Projectile Types

| Type | Speed | Behavior | Towers |
|------|-------|----------|--------|
| Hitscan | Instant | Damage on frame of fire | Sniper, Minigun, Gauss |
| Basic bullet | 2.8 tiles/sec | Linear from barrel to target | Basic |
| Cannonball | Varies | Arcing, explodes on impact | Cannon |
| Beam | Instant | Line from tower to target | Laser (charge-up, then continuous) |
| Radial bullet | Varies | Counterclockwise, pierces | Splash |
| Arc bullet | Varies | Fan pattern, first enemy hit | Multishot |
| Seeking missile | Varies | Tracks target, can re-acquire | Missile |
| Slow bullet | 1.5 tiles/sec | Very slow, poison on hit | Venom |
| Chain lightning | Instant | Jumps between enemies | Tesla |

**Key insight for Holdfast**: Projectile speed is one of the 5 core tower stats (range, damage, attack speed, **projectile speed**, rotation speed). It governs gameplay behavior, not just visuals.

### 2.3 Projectile Visual Design

- **Small, bright, high-contrast shapes** — typically 2-4px circles or rectangles
- **Color-matched to tower** for readability at a glance (who shot that?)
- **Trail rendering** — many projectiles leave a faint fading trail of same color
- **Size/visibility scales with game state** — 1.8.8 update adjusted projectile and trail sizes
- **Cap at 16 tiles/sec max projectile speed** — prevents collision-skip issues (from bug tracker)
- **Ricochet**: Basic tower's Foundation ability gives 20% (upgradable) chance to bounce to another enemy. Each bounce reduces projectile speed; at 0 speed the projectile disappears.
- **Piercing**: Splash, Multishot, and others can pierce through enemies, damaging multiple per projectile
- **Missile seeking**: Can switch targets mid-flight if original target dies

### 2.4 Impact Effects

- **Explosions**: Cannon and Missile have expansion ring + particle burst. Damage falloff from epicenter. Enemies closer together means splash damage overlaps.
- **Hit flash**: Brief colored circle at impact point, matches damage type
- **Killshot**: Sniper's instant-kill ability has a distinctive **purple trail** + **"KILLSHOT!"** popup text at the target location
- **Fire**: Minigun at full speed and some abilities ignite enemies (visual: burning overlay + DoT)
- **Poison**: Venom applies a green overlay on enemy, multiple stacks shown as brighter green

### 2.5 Damage Numbers

- Float up from the hit point, fade out over ~1s
- **Different visuals by damage type**: normal / more effective / less effective / critical / special
  - Effective damage: larger, brighter number
  - Ineffective damage: smaller, dimmer number
  - Critical hit: distinctive color + potential pop
  - These can be configured in settings
- Scale with game speed (numbers float faster at 3x)
- Coin particles stop movement when paused — same behavior applies to damage particles

---

## 3. Enemy Visual Design

### 3.1 Enemy Shape & Color Coding

| Enemy | Shape | Color | Behavior |
|-------|-------|-------|----------|
| Regular | Circle | Gray/white | Standard, no special properties |
| Fast | Triangle | Yellow | High speed, low HP |
| Strong | Square | Red | High HP, slow |
| Icy | Diamond (shield icon) | Blue | Shield = 25% max HP, immune to freeze/slow while shielded |
| Armored | Circle with shield aura | Gray aura | Aura gives allies 50% damage reduction |
| Jet | Elongated diamond | Orange | Very fast, bypasses some towers |
| Light | Pulsing circle | White/gold | Damage type protection: 75% protection for 6s after hit |
| Fighter | Pentagon | Green | Splits into 3 smaller enemies on death |
| Boss | Large circle with icon | Varies | Unique abilities, no instant kill, immune to some effects |
| Treasure | Star | Gold | Rare spawn, gives bonus rewards |

**Key insight**: Enemy shapes are geometrically distinct (circle, triangle, square, diamond, pentagon, star) — each is readable as a silhouette even without color information. This is the bar Holdfast should aim for.

### 3.2 Enemy Status Overlays

- **Slow**: Blue tint / ice crystals overlay
- **Stun**: Stars circling the enemy
- **Poison**: Green glow overlay
- **Fire**: Red/orange flame overlay
- **Armor buff**: Shield icon + gray aura (from Armored enemy proximity)
- **Damage type protection**: Golden shimmer (Light enemy after hit)
- **Shield**: Segmented bar above HP bar (Icy enemy)

**Key insight**: Statuses are communicated via BOTH color overlay + icon/shape change. Redundant encoding.

---

## 4. Particle System & Visual Feedback

### 4.1 Particle Design Principles

From Prineside's update notes and community feedback:

- **Particles explain the hit, not hide it** — they reinforce direction, material type, and intensity
- **Particle count fits the event** — small hit = few particles, explosion = burst
- **Coin particles and death particles** respect real-time — stop when game is paused (used for frame-by-frame analysis)
- **Multithreaded rendering** for particle-heavy scenarios (thousands of projectiles in endless mode)
- **Toggle to disable** visual effects entirely in settings for performance

### 4.2 What Has Particles

| Event | Particle behavior |
|-------|------------------|
| Tower firing | Muzzle flash at barrel tip |
| Projectile impact | Small burst matching damage color |
| Enemy death | Brief sprite dissolve + colored burst |
| Coin drop | Gold particle streams toward miner |
| Killshot | Purple trail + text popup |
| Explosion | Radial particle burst with damage falloff |
| Chain lightning | Electrical arc lines between enemies |

### 4.3 Screen Shake

Infinitode 2 uses restrained screen shake — primarily from explosions and boss actions. Not overused. The approach aligns with modern best practices:

- **Shake as punctuation, not wallpaper** — bigger events = rarer shake
- **Short duration** (0.05–0.14s typical)
- **Directional bias** toward impact source when possible
- **Clamp intensity** — prevent stacking multiple shakes

---

## 5. Performance & Optimization

### 5.1 Design Principles

- 30 FPS lock — consistent frame pacing is better than variable high FPS
- Projectile cap: max 16 tiles/sec speed (prevents collision bugs)  
- Splash tower: 1 projectile per frame limit (prevents CPU spikes)
- Damage queued and resolved at end of frame (not immediately) — prevents dereferenced enemy bugs, fair damage attribution
- All rendering handles being toggled off entirely for low-end devices
- "Clean detailed mode" renders projectiles semi-transparent

### 5.2 What Holdfast Should Copy

- **Geometric shape variety** — enemies should be distinct in silhouette (not just color)
- **Color + shape redundancy** — two channels for the same info
- **Projectile speed as gameplay stat** — governs hit timing, not just visual
- **Status overlay philosophy** — tint + icon, redundant encoding
- **Damage numbers by type** — effective/ineffective/critical visual distinction
- **Restrained screen shake** — explosions only
- **Performance as feature** — ability to disable effects

---

## 6. Comparison: Infinitode 2 vs Holdfast Current

| Aspect | Infinitode 2 | Holdfast (current) | Gap |
|--------|-------------|-------------------|-----|
| Unit/tower shapes | Distinct per type (square, triangle, circle, etc.) | Ground=rounded rect, Ranged=triangle, Enemy=circle | Needs more silhouette variety |
| Enemy shape variety | 11+ distinct geometric shapes | Circles only | **Gap** — all enemies identical shape |
| Projectile variety | 9 types with different behaviors | 3 types (color only, same shape logic) | **Minor** — needs visual per damage type |
| Status overlays | Tint + icon + shape change | None | **Gap** — no visual status feedback |
| Damage numbers | Type-distinct (effective/ineffective/crit) | Floating text only | **Minor** — no visual damage type distinction |
| Particle system | Multithreaded, toggleable | Death particles only | **Gap** — no hit particles |
| Screen shake | Restrained, explosions only | On kills and deaths | Aligned |
| Performance options | Full visual toggle, clean mode, scale slider | None | **Gap** — no settings |
| Tower rotation anim | Yes, with rotation speed stat | None (units face direction) | Different design — units don't rotate |
| Impact effects | Flash + particles per hit | Hit flash (alpha flicker) | **Minor** — new projectile system addresses this |

---

## 7. Holdfast Action Items (from Infinitode 2 Patterns)

1. **Enemy silhouette variety** — at minimum: circle (standard), triangle (fast), square (tank), diamond (shielded). Each with distinct size + outline weight.
2. **Status overlays** — slow = blue tint, armor = shield icon, poison = green glow. Simple Graphics overlay on container.
3. **Damage number variety** — effective hits = larger/bright, resisted = smaller/dim.
4. **Hit impact particles** — small colored burst on projectile hit, not just alpha flash.
5. **Performance toggle** — option to disable all particles/effects for low-end.
6. **Projectile speed as stat** — currently fixed ~250ms travel; should vary by unit type (artillery slower, sniper faster).

## 8. References

- Official site: https://infinitode.prineside.com
- Game design doc: https://beta.infinitode.prineside.com/?m=game_design
- Press kit (tower models/screenshots): https://infinitode.prineside.com/?m=press_kit_en
- Bug tracker (engineering details): https://tracker.prineside.com
- Modding docs (architecture): https://infinitode.prineside.com/modding/?p=game-architecture
- Wiki: https://infinitode-2.fandom.com/wiki/Infinitode_2_Wiki
- Developer GitHub: https://gist.github.com/prineside/a3e94b140bcfb5f45f11b301c9636578 (game loop simulation example)
