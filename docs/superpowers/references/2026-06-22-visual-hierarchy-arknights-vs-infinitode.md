# Visual Hierarchy — Arknights (Primary) vs Infinitode 2 (Secondary)

**Date:** 2026-06-22
**Purpose:** Clarify which layer of the visual experience defers to which reference. Arknights owns all game design, strategic flow, and UX hierarchy. Infinitode 2 contributes visual/animation patterns that fit within Arknights' framework.

**Ranking:** Arknights > Infinitode 2 > Don't do it.

---

## Layer 1 — Game Design & Strategic Flow (Arknights owns, non-negotiable)

| Concern | Arknights Rule | Infinitode 2 approach | Can we use Infinitode? |
|---------|---------------|----------------------|----------------------|
| Attack timing | Three-phase: wind-up → launch → wind-down. Wind-up is the strategic **reaction window**. | Attack speed has hard 30fps cap. No wind-up concept — just fire rate. | **No** — wind-up IS the strategic mechanic. Infinitode's model removes the reaction window. |
| Damage timing | Projectile = damage on **impact**. Melee = damage on **launch**. Attacks can be **interrupted** during wind-up. | Most damage is instant (hitscan) or on projectile hit. No interrupt window on tower attacks. | **No** — interrupt window is core Arknights strategy. |
| Retreat/withdraw | Cancels incoming attack if during wind-up. Unit refunds partial DP. | No retreat mechanic. Towers are sold for partial refund. | **No** — not applicable (different game structure). |
| Attack interval | Total time between attacks = wind-up + launch + wind-down. If animation exceeds interval, animation plays faster. | Attack speed = shots/second. Simple multiplication. | **No** — Arknights' phase-based model is richer strategically. |
| Target selection | Fixed priority per unit type (closest to goal, lowest DEF, etc.) | Configurable per tower (First, Last, Weakest, Strongest, Nearest, Random). | **Partial** — we could offer targeting modes as a trait or player config, but Arknights' auto-targeting is simpler and sufficient for v1. |
| Deployment cost | DP system. Units have individual DP cost. Retreat refunds half. | Coin economy. Towers cost coins, sell for partial refund. | **No** — DP system IS the strategic economy. |
| Unit blocking | Ground units block 1-3 enemies. Blocking changes targeting priority. | No blocking mechanic. Enemies walk past towers. | **No** — blocking is core to Arknights' positioning strategy. |
| Range patterns | Directional, tile-based (meleeFront, ranged4x3, etc.). Rotated by facing. | Radial range circles (distance in tiles, 360°). | **No** — directional range + facing is essential Arknights positioning. |

---

## Layer 2 — Attack Visuals & Animations (Arknights primary, Infinitode informs)

| Concern | Arknights | Infinitode 2 | Our current impl | Verdict |
|---------|-----------|-------------|-----------------|---------|
| **Projectile shape** | Varies by operator. Generally small, colored, fast. | Small brightly-colored shapes (2-4px). Color matches tower. Trail optional. | Kinetic=white circle, Thermal=orange diamond, True=white beam. Has inner highlight. | **Keep ours**, but add faint trail matching Infinitode style |
| **Projectile speed** | Stat on some operators (e.g., Loopshooter 15 tiles/sec out, 3.75 return). Affects when damage lands. | Core tower stat in tiles/sec. Affects ricochet, seeking, hit timing. Affected by buffs/debuffs on projectile speed. | Fixed 0.15-0.4s travel time (varies by distance only). Not a configurable stat. | **Adopt with caveat — see projectile speed gameplay analysis below** |
| **Projectile trail** | Rare. Mostly fast projectiles without trails. | Common. Faint fading trail behind projectile, same color. | None. | **Adopt Infinitode** — add brief alpha-fade trail to all projectiles. Low cost, big readability gain. |
| **Muzzle flash / fire point** | Projectile emits from weapon/body position. | Projectile emits from barrel tip. Tower rotation aligns barrel toward target. | Emits from tile center. | **Keep ours** — geometric shapes don't have barrel positions. Tile center is correct. |
| **Hit impact** | Small flash/particle on contact. | Flash + damage number. Size varies by damage effectiveness. | Projectile hits → expanding circle flash (80ms). Damage number floats up separately. | **Keep + enhance** — add damage-effectiveness visual to flash size (effective=bigger, resisted=smaller). |
| **Swing animation** | Brief melee weapon swing. Varies by operator (Siege long wind-up vs Saga short). | No melee. Towers are ranged. | Container scale pulse (1→1.15→1) toward target. | **Keep ours**. Fits Arknights melee vibe. Infinitode has no equivalent. |
| **Wind-up telegraph** | Subtle animation start. Player learns timing by observation. | Sniper has explicit narrowing-angle indicator during 1s aim. | Red pulsing circle behind enemy (0.4s). | **Keep ours** — the red circle is clearer than Arknights' subtle animations for a geometric-shape game. But consider making it more Arknights-subtle (smaller, less opaque) for advanced levels. |
| **Tower/unit rotation** | Units face a direction. No per-frame rotation tracking. | Towers rotate to face target with rotation speed stat. Rotation visible as barrel movement. | No rotation (static facing). | **Hold** — not appropriate for v1. Units are deployed on grid with facing direction. Rotation would break facing-based range patterns. |

### Projectile Speed — Gameplay Effect Analysis

**Current state:** Projectile travel time is calculated as `distance * 0.08` sec, clamped [0.15, 0.4]. Damage is instant (cosmetic projectile). The travel time has zero gameplay effect.

**What changes if we make `projectileSpeed` a unit config stat (tiles/sec):**

| Scenario | With instant damage (current) | With deferred damage (Arknights-style) |
|----------|------------------------------|----------------------------------------|
| Unit shoots enemy | Projectile flies, damage already applied. Visual only. | Damage applies on projectile impact. Enemy can die before projectile arrives → wasted shot. |
| Enemy moves during flight | Projectile tracks target position via lerp. Always hits. | Same tracking, but now timing of damage matters. |
| Player retreats unit mid-projectile | N/A (unit attacks are cosmetic) | Projectile from that unit should fizzle (no damage). |
| Multiple units target same enemy | All projectiles fly. Overkill possible. | First projectile kills, rest fizzle. |
| Slow vs fast projectile feel | Same 0.15-0.4s regardless of unit type | Sniper: 8 tiles/sec → fast, snappy. Artillery: 2 tiles/sec → visible lob. |

**Recommendation for v1:** Add `projectileSpeed` as a visual-only config stat. Use it to compute travel duration (`distance / speed`). Keep damage instant. This:
- Makes each unit type **feel** different (sniper hits fast, artillery lobs slowly)
- Doesn't change game logic (no wasted shots, no interrupt window on unit attacks)
- Prepares the config field for future deferred-damage mechanics
- Matches Infinitode's approach where projectile speed is a core stat even without complex damage timing

**To make it gameplay-relevant later:** Switch unit attacks to deferred damage (damage on projectile impact). This adds strategic depth:
- Fast projectile = reliable damage (enemy can't escape)
- Slow projectile = risk of wasted attack if enemy dies before impact
- Retreating unit mid-flight cancels unlanded damage
- Creates natural distinction between "precision" (fast) and "barrage" (slow) unit roles

For v1, visual-only with config field is the right call. The stat is infrastructure for later.

---

## Layer 3 — Visual Feedback Systems (Infinitode leads, Arknights confirms)

### 3.1 Damage Number / Hit Flash Visual Distinction

**Current damage model (no critical hits):**
| Damage type | Formula | Effective when | Resisted when |
|-------------|---------|----------------|---------------|
| `kinetic` | `max(ATK×5%, ATK−DEF)` | Low enemy DEF (damage ≈ ATK) | High enemy DEF (damage at 5% floor) |
| `thermal` | `max(ATK×5%, ATK×(1−RES/100))` | Low enemy RES (damage ≈ ATK) | High enemy RES (damage at 5% floor) |
| `true` | `ATK` (no floor) | Always full damage | Never resisted |

There are no critical hits. The visual distinction is between **effective** (damage near full ATK) and **resisted** (damage near the 5% floor or heavily reduced by DEF/RES).

**Where the visual fits:** In the existing hit feedback pipeline:
1. `onDamageDealt(damage, enemy, damageType)` — for player→enemy
2. `onUnitDamageDealt(damage, unit, damageType)` — for enemy→player
3. `showDamageNumber(damage, enemy, damageType)` / `showUnitDamageNumber(damage, unit, damageType)`

**Proposed mapping:**
| Damage condition | Hit flash | Damage number |
|-----------------|-----------|---------------|
| Near full ATK (effective) | Larger flash, bright color | Larger text, white/bright |
| Near 5% floor (resisted) | Smaller flash, dim color | Smaller text, gray/dim |
| True damage | Distinctive flash (white/piercing) | Normal text, special marker |
| Damage = 0 (immune?) | Tiny spark, no number | "0" or "-" |

This helps the player instantly read: "kinetic is doing 40 damage to a 2000 HP enemy = heavily resisted → switch to thermal." It's a **teaching/readability** tool, not a crit system.

**Implementation:** Compare `damage` to the attacker's `ATK`. If `damage > ATK * 0.5` → effective. If `damage <= ATK * 0.5` → resisted. Adjust flash scale + number size accordingly.

### 3.2 Status Overlays — Where Statuses Come From

**Current status effects in Holdfast:**

| Status | Source | Duration | Effect | Visual feedback needed |
|--------|--------|----------|--------|----------------------|
| `slow` | `SlowOnHit` trait (Decel Binder unit) | 2s (configurable) | Movement speed ×0.5 | Blue tint + ice crystal icon on enemy |
| (future) `stun` | Not yet implemented | TBD | Prevents movement/attack | Stars circling enemy |
| (future) `armor break` | Not yet implemented | TBD | Reduces DEF | Broken shield icon |
| (future) `burn` | Not yet implemented | TBD | Damage over time | Red/orange glow |

**The `slow` status is applied by units with the `SlowOnHit` trait.** It's tracked on the enemy via `statusEffects[]` array and `getSpeedMultiplier()` method. There is currently **zero visual feedback** — the enemy just moves slower with no indicator.

**Where the visual overlay fits:** During the enemy's visual update (in `GameScene.update()` or `EnemySprite`), inspect `statusEffects` and draw a colored Graphics overlay:
- Check `enemy.statusEffects` array after combat processing
- Draw a thin colored ring + tint on the enemy container for each active status
- Remove the overlay when status expires
- Implementation: lightweight Graphics object added as child of enemy container, redrawn when status changes

**Infinitode pattern to adopt:** Tint + icon, redundant encoding. For geometric shapes, a tinted ring/glow around the enemy (blue for slow) is the most readable overlay without adding visual clutter.

---

## Layer 4 — Visual Elements Exclusive to Infinitode (Skip for Holdfast v1)

| Element | Why it works in Infinitode | Why NOT for Holdfast |
|---------|---------------------------|---------------------|
| Tower rotation animation | Towers are circular/radial. Rotation doesn't affect gameplay. | Units have directional facing that determines range patterns. Rotation would break game logic. |
| Circular range display | Simple radius in tiles. Radial. | Tile-based range patterns (directional, rotated by facing). Arcane-range display would be misleading. |
| Projectile ricochet | Fun chaos. Fits Infinitode's "watch it work" design. | Would undermine planned positioning strategy. Damage should be predictable. |
| Missile seeking/tracking | Homing projectiles. Low player control expectation. | Unit attacks already auto-target. Seeking projectiles add visual noise without strategic depth. |
| Splash tower (no-aim) | Distinct tower type. Works with Infinitode's radial design. | No equivalent unit type in Holdfast v1 roster. Could revisit for a future "mortar" unit. |

---

## Decision Matrix: What to Implement Next

| Priority | Feature | Source | Effort | Impact | Status |
|----------|---------|--------|--------|--------|--------|
| **P0** | Enemy silhouette variety (triangle fast, square tank, diamond shield) | Infinitode | Low | High | **DEFERRED** — dedicated design step needed |
| **P1** | Status overlays on enemies (Graphics ring + tint for slow, etc.) | Both | Low | High | Ready — status effects already exist in code, just need visual |
| **P1** | `projectileSpeed` as unit config stat (visual-only for v1) | Infinitode | Low | Medium | Ready — makes unit feel distinct, adds config field for future |
| **P2** | Damage-type visual in hit flash size (effective vs resisted) | Both | Low | Medium | Ready — compare damage to ATK, scale flash accordingly |
| **P2** | Performance toggle (disable particles/effects) | Infinitode | Medium | Medium | **DEFERRED** — UX discussion needed |
| **P2** | Projectile trail (faint fading line) | Infinitode | Low | Low | Ready — add alpha-fade trail to `spawnProjectile` |
| **P3** | Pause-frozen particles | Both | Low | Low | Ready — ensure tween freeze on pause |
| **P3** | CVD-friendly mode (patterns + shapes) | Infinitode | Medium | Low | **DEFERRED** — after silhouette variety is done |

---

## Summary

```
GAME DESIGN:          Arknights >>>>> Infinitode  (not comparable)
ATTACK ANIMATIONS:    Arknights > Infinitode      (Infinitode informs projectile polish)
VISUAL FEEDBACK:      Infinitode >= Arknights      (Infinitode leads on geometric-game feedback)
PERFORMANCE:          Infinitode >>>>> Arknights   (solo-dev optimization mastery)
```

The core principle: **Infinitode visuals that enhance readability without adding strategic noise are adoptable.** Anything that changes how damage timing, targeting, or positioning works stays Arknights-native.
