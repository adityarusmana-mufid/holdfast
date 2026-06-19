# Screen UI Layout — Phase 1

**Date:** 2026-06-18
**Status:** Implemented (documented for reference)
**Basis:** 1280×720 canvas, `Phaser.Scale.FIT` + `CENTER_BOTH`

## Canvas

- **Resolution:** 1280 × 720
- **Scaling:** `Phaser.Scale.FIT` with `CENTER_BOTH` — scales proportionally to fill viewport while maintaining aspect ratio
- **Origin:** Canvas at (0,0), all coordinates absolute within 1280×720 space

## Scene: GameScene

Layout is divided into vertical columns. The grid is positioned dynamically based on left palette width.

```
┌──────┬──────────────────────────────────────┐
│      │                                      │
│ STATS│   DEPLOYMENT GRID                    │
│ PANEL│   (dynamic offsetX, centered)        │
│      │                                      │
│ UNIT │                                      │
│ SEL  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ PAL  │   │tile│ │tile│ │tile│ │tile│      │
│      │   └────┘ └────┘ └────┘ └────┘      │
│ [scroll]    ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│            │tile│ │tile│ │tile│ │tile│   │
│            └────┘ └────┘ └────┘ └────┘   │
│ HUD:                                       │
│ DP: 10/99  Units: 0/8  Lives: 3  Hostiles  │
│ Simulation active                          │
│                                            │
│            [ START SIMULATION ]            │
└──────┴──────────────────────────────────────┘
```

### Left Column (~160px wide)

| Element | Position | Description |
|---------|----------|-------------|
| Stats panel | `x=10, y=10` | 3-line text: unit type, HP, ATK/DEF/RES/BLK |
| Unit palette | `x=10, y=70` | Scrollable list of unit buttons |
| Palette header | `y=54` | "UNIT SELECT" label |
| Actions | Below palette | Clear All, Restart, Load Level, Back links |

**Unit button** (140×34px):
```
┌──────────────────────────────────┐
│ [■] Subtype Label                │
│      DP 12                       │
└──────────────────────────────────┘
```
- Ground units: rounded rect icon (12×12)
- Ranged units: triangle icon
- Selected: blue border (0x00a2ff)
- Unaffordable: dimmed (alpha 0.5)
- On cooldown: red overlay + `remaining.toFixed(2)s` label on right
- Sort: by current DP cost ascending
- Filter: only non-deployed units shown

### Grid Area (remaining width)

Grid offset calculated:
```typescript
const leftArea = 160
const gridW = cols * TILE_SIZE
const availW = scale.width - leftArea
const gridOX = leftArea + Math.floor((availW - gridW) / 2)
const gridOY = GRID_OFFSET_Y  // 128
```

Centered between left palette edge and right screen edge.

### HUD — Top of Grid Area

| Element | Position | Content |
|---------|----------|---------|
| DP text | ~12% width, y=10 | `DP: {floor(currentDP)}/{dpCap}` (accent color) |
| Limit text | same, y=32 | `Units: {active}/{deploymentLimit}` |
| Lives text | ~32% width, y=10 | `Lives: {lives}` (danger color) |
| Wave text | same, y=32 | `Hostiles: {count}` |
| Status text | ~12% width, y=54 | Phase-dependent status message |
| Level name | right-aligned, y=10 | `levelData.name` (dim) |

### Bottom Bar

| Element | Position | Description |
|---------|----------|-------------|
| Battle button | center bottom | `[ START SIMULATION ]` → `[ SIMULATION ACTIVE ]` |
| Cancel facing | left edge, y=700 | `CANCEL` shown during facing confirmation |
| Flash messages | center, y=650 | Temporary floating messages |
| Result text | center, y=320 | Victory/defeat with tween pulse |

### Overlays

| Element | Depth | Description |
|---------|-------|-------------|
| Range preview | 8 | Blue tile highlights during facing |
| Facing arrow | 9 | Blue arrow from unit center |
| Cancel indicator | 10 | Red X on tile center when cursor near center |
| Hover indicator | 15 | Green/red tile overlay on mouse hover |
| Enemy sprites | 9 | Circular sprites on the grid |
| Unit sprites | 10 | Square/triangle sprites on the grid |
| Grid overlay | -5 | Ghost grid lines |
| Background gradient | -100 | White-to-light-gray vertical gradient |

### Inspect Mode

Entered by clicking an already-deployed unit:
- Stats panel shows current unit data (HP, facing direction)
- Two buttons appear:
  - `RETREAT [+{refund} DP]` — retrieves unit, refunds DP
  - `[ CLOSE ]` — exits inspect mode
- Game speed halves (0.5×) while inspecting

## Scene: SquadScene

```
┌──────────────────────────────────────────────────┐
│                  SQUAD SELECTION       [Auto Fill]|
│                                                    │
│     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│     │ SLOT 1 │ │ SLOT 2 │ │ SLOT 3 │ │ SLOT 4 │  │
│     └────────┘ └────────┘ └────────┘ └────────┘  │
│     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│     │ SLOT 5 │ │ SLOT 6 │ │ SLOT 7 │ │ SLOT 8 │  │
│     └────────┘ └────────┘ └────────┘ └────────┘  │
│     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│     │ SLOT 9 │ │SLOT 10 │ │SLOT 11 │ │SLOT 12 │  │
│     └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                    │
│            Squad: {n}/12 selected                   │
│                                                    │
│  < Back                               [Start Mission]│
└──────────────────────────────────────────────────┘
```

- 12 slots in 4×3 grid (100×100px each, 12px gap)
- Auto-fill button at top-right fills empty slots
- Click empty slot → open picker overlay (scrollable list of all 26 units)
- Show info overlay on selected unit
- Back returns to LevelSelectScene, Start Mission proceeds to GameScene

## Scene: EditorScene

```
┌──────────┬──────────────────────┬──────────────────┐
│ TILE PAL │                      │  PROPERTIES      │
│          │      EDITOR GRID     │                  │
│ [Ground] │      (centered)      │  Grid size       │
│ [Ranged] │                      │  Tile attributes │
│ [Floor]  │                      │  Route colors    │
│ [ Wall]  │                      │  Wave editor     │
│ [Spawn]  │                      │                  │
│ [ Goal]  │                      │  Export/Import   │
│ [Repair] │                      │  buttons         │
│ [Armor]  │                      │                  │
│ [Eraser] │                      │                  │
│          │                      │                  │
│ [scroll] │                      │                  │
│          │                      │                  │
└──────────┴──────────────────────┴──────────────────┘
```

- Left palette: `x=10, w=140` — 8 tile types + eraser
- Right panels: `x=1074, w=200` — properties, wave editor
- Grid: calculated to center between palette and panels

## Scene: ChapterSelectScene

Simple chapter list:
- Title "HOLD FAST" centered
- Click chapter → LevelSelectScene

## Scene: LevelSelectScene

Grid of level buttons for the selected chapter:
- Each level shows name/ID
- Click → SquadScene (or GameScene with full roster for editor path)

## Scene: ResultScene

Received from GameScene:
```typescript
{
  chapterId, levelId, squad, outcome, stars,
  livesRemaining, enemiesDefeated
}
```

Displays:
- Outcome text ("SYNC COMPLETE" / "DESYNC")
- Star rating (1–3 stars)
- Lives remaining, enemies defeated
- Buttons: Retry, Next Level, Back to Levels

## Scene: BootScene

- Minimal boot screen
- Immediately starts ChapterSelectScene

## Font & Color Constants

Defined in `src/ui/Constants.ts`:

```typescript
FONTS = {
  h1: { fontSize: '28px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace' },
  h2: { fontSize: '20px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace' },
  body: { fontSize: '14px', fontFamily: '"Share Tech Mono", "Roboto Mono", monospace' },
}

COLORS = {
  text: {
    primary: '#2c3e50',
    secondary: '#607d8b',
    accent: '#00a2ff',
    danger: '#d32f2f',
    warning: '#ff9100',
    success: '#00c853',
    dim: '#90a4ae',
  }
}
```

All text uses monospace font family: `"Share Tech Mono", "Roboto Mono", monospace`.

## Design Decisions

1. **Stats panel, not tooltips** — selected unit shows stats in fixed panel rather than floating. This avoids occlusion and provides consistent reference.

2. **Palette scroll, not pagination** — scroll via mouse wheel with max scroll calculated from unit count. No page buttons.

3. **No in-grid UI** — no text labels on tiles, no numbers on grid. All information displayed in HUD or palette.

4. **Flash messages instead of toast notifications** — messages fade up from bottom-center using Phaser tweens. No permanent notification area.

5. **Inspect mode halves game speed** — gives player time to read stats and make retreat decisions without pausing entirely.
