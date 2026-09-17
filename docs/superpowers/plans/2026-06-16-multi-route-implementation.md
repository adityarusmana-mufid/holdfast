# Multi-Route & 6-Tile System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-route tile-based routing with multi-route waypoint infrastructure and 6-tile palette (ground, floor, ranged, wall, spawn, goal).

**Architecture:** Routes become first-class objects stored in LevelData with waypoint-based paths. Spawn/goal are physical grid tiles painted via palette. Waves reference routes by index. Grid.ts loses routePath/setSpawn/getSpawn and gains multi-route validation. EditorScene gets a route panel alongside the palette. EnemyManager spawns enemies per-route using wave.routeIndex.

**Tech Stack:** TypeScript, Phaser 3

**Spec:** `docs/superpowers/specs/2026-06-16-multi-route-tile-system-design.md`

---

### Task 1: Update Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update TileType enum to 6 values**

  ```typescript
  export enum TileType {
    Ground = 'ground',
    Floor = 'floor',
    Ranged = 'ranged',
    Wall = 'wall',
    Spawn = 'spawn',
    Goal = 'goal',
  }
  ```

- [ ] **Step 2: Add Route, Waypoint, update Wave, update LevelData**

  ```typescript
  export interface Position {
    row: number
    col: number
  }

  export interface Waypoint {
    row: number
    col: number
    pauseDuration?: number
  }

  export interface Route {
    color: number
    spawn: Position
    goal: Position
    waypoints: Waypoint[]
  }

  // Update Wave:
  export interface Wave {
    routeIndex: number
    entries: WaveEntry[]
    preludeDuration: number
  }

  // Update WaveEntry:
  export interface WaveEntry {
    enemyType: string
    count: number
    spawnInterval: number
  }

  // Update LevelData:
  export interface LevelData {
    name: string
    cols: number
    rows: number
    tiles: Tile[][]
    routes: Route[]
    waves: Wave[]
    startingDP: number
    dpRegenRate: number
    dpCap: number
    deploymentLimit: number
    lives: number
  }
  ```

  Remove the old `Waypoint` if one existed. Remove `Direction` if unused — keep it since directional deployment uses it.

- [ ] **Step 3: Commit**

  ```bash
  git add src/types/index.ts
  git commit -m "feat: add 6-tile types, Route/Waypoint/Position interfaces, routeIndex on Wave"
  ```

---

### Task 2: Update GridMath Utilities

**Files:**
- Modify: `src/shared/utils/GridMath.ts`

- [ ] **Step 1: Add ROUTE_COLORS constant**

  ```typescript
  export const ROUTE_COLORS = [
    0xff4444, // red
    0x4488ff, // blue
    0x44dd44, // green
    0xffaa00, // orange
    0xcc44ff, // purple
    0x00cccc, // cyan
    0xff66aa, // pink
    0x888888, // gray
  ]
  ```

- [ ] **Step 2: Update isDeployable for new tile types**

  ```typescript
  export function isDeployable(type: TileType): boolean {
    return type === TileType.Ground || type === TileType.Ranged
  }
  ```

- [ ] **Step 3: Update isWalkable for new tile types**

  ```typescript
  export function isWalkable(type: TileType): boolean {
    return type === TileType.Floor || type === TileType.Spawn || type === TileType.Goal
  }
  ```
  (Enemies walk through floor, spawn, and goal tiles. Ground tiles are also traversable via waypoints. This flag is used for editor validation — waypoints should only be placed on walkable tiles.)

- [ ] **Step 4: Update tile color/border/text helpers to handle 6 types**

  ```typescript
  export function tileColor(type: TileType): number {
    switch (type) {
      case TileType.Ground: return 0x3a3a3a
      case TileType.Floor: return 0x2a2a2a
      case TileType.Ranged: return 0x4a4a3a
      case TileType.Wall: return 0x1a1a1a
      case TileType.Spawn: return 0x4a1a1a
      case TileType.Goal: return 0x1a1a4a
    }
  }

  export function tileBorderColor(type: TileType): number {
    switch (type) {
      case TileType.Ground: return 0x555555
      case TileType.Floor: return 0x444444
      case TileType.Ranged: return 0x666655
      case TileType.Wall: return 0x333333
      case TileType.Spawn: return 0x883333
      case TileType.Goal: return 0x333388
    }
  }

  export function tileLabel(type: TileType): string {
    switch (type) {
      case TileType.Ground: return ''
      case TileType.Floor: return '//'
      case TileType.Ranged: return '⬆'
      case TileType.Wall: return '▤'
      case TileType.Spawn: return 'S'
      case TileType.Goal: return 'G'
    }
  }

  export function tileTextColor(type: TileType): string {
    switch (type) {
      case TileType.Spawn: return '#ff6666'
      case TileType.Goal: return '#6666ff'
      default: return '#888888'
    }
  }
  ```

- [ ] **Step 4b: Deduplicate `Position` — remove from GridMath, import from types**

  Remove the local `Position` interface from GridMath (currently at ~line 3). Import it from types instead:

  ```typescript
  import { TileType, Position } from '../../types'
  ```

- [ ] **Step 5: Add route validation helper function**

  Use the existing exported `chebyshevDistance` from GridMath:

  ```typescript
  export function validateRoutePath(route: Route): boolean {
    const path = [route.spawn, ...route.waypoints, route.goal]
    for (let i = 1; i < path.length; i++) {
      if (chebyshevDistance(path[i - 1], path[i]) > 1) return false
    }
    return path.length >= 3 // spawn + ≥1 waypoint + goal
  }
  ```

  `chebyshevDistance` already exists in GridMath (~line 68) — no need to redefine.

- [ ] **Step 6: Commit**

  ```bash
  git add src/shared/utils/GridMath.ts
  git commit -m "feat: update GridMath for 6-tile system and route validation"
  ```

---

### Task 3: Refactor Grid.ts

**Files:**
- Modify: `src/entities/Grid.ts`

- [ ] **Step 1: Remove routePath, setSpawn, getSpawn, setGoal, getGoal, getFullRoute, addWaypoint, clearWaypoints, getWaypointCount, updateRouteConnectivity, getDisconnectedTiles**

  These are replaced by the routes array in LevelData. The grid no longer owns route data.

  Remove class fields:
  ```typescript
  // REMOVE these fields:
  // routePath: Position[] = []
  // disconnectedTiles: Set<string> = new Set()
  ```

  Remove methods:
  - `setSpawn(pos)` / `getSpawn()` / `setGoal(pos)` / `getGoal()`
  - `getFullRoute()` / `addWaypoint(pos)` / `clearWaypoints()` / `getWaypointCount()`
  - `updateRouteConnectivity()` / `getDisconnectedTiles()`

- [ ] **Step 2: Update initEmpty to fill with Ground instead of Floor**

  ```typescript
  initEmpty(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    this.tiles = []
    for (let r = 0; r < rows; r++) {
      this.tiles[r] = []
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          this.tiles[r][c] = { row: r, col: c, type: TileType.Wall }
        } else {
          this.tiles[r][c] = { row: r, col: c, type: TileType.Ground }
        }
      }
    }
  }
  ```

- [ ] **Step 3: Update render() to handle 6 tile types**

  - Draw Spawn tiles with red-tinted background + "S" label (use tileLabel)
  - Draw Goal tiles with blue-tinted background + "G" label
  - Remove route path arrow rendering (waypoints are rendered by the editor or not at all)
  - Remove disconnected route tile indicators

  The render method currently draws each tile, then draws the route path overlay. Remove the route path overlay section. Keep grid lines.

- [ ] **Step 4: Update toLevelData() to produce new format**

  ```typescript
  toLevelData(name: string): LevelData {
    return {
      name,
      cols: this.cols,
      rows: this.rows,
      tiles: this.tiles,
      routes: [],  // routes are managed by EditorScene
      waves: [],
      startingDP: 30,
      dpRegenRate: 1,
      dpCap: 99,
      deploymentLimit: 8,
      lives: 10,
    }
  }
  ```

- [ ] **Step 5: Update fromLevelData() for new format with legacy migration**

  ```typescript
  fromLevelData(data: LevelData): void {
    this.cols = data.cols
    this.rows = data.rows
    this.tiles = data.tiles.map((row, r) =>
      row.map((tile, c) => ({
        row: r,
        col: c,
        type: this.migrateTileType(tile.type),
      }))
    )
    // Legacy migration: if no routes array found, build one from old format
    if (!data.routes && data.waypoints && data.waypoints.length > 0) {
      // routes will be extracted by the EditorScene during import
      // just flag it — the caller should call migrateLevelData()
    }
  }

  /**
   * Converts legacy LevelData (pre-multi-route) to new format.
   * Finds spawn/goal tiles on grid + old waypoints array.
   */
  static migrateLevelData(data: any): LevelData {
    const tiles = data.tiles.map((row: any[], r: number) =>
      row.map((tile: any, c: number) => ({
        row: r, col: c,
        type: migrateTileTypeStatic(tile.type),
      }))
    )

    // Find old spawn/goal tiles
    let spawnPos = { row: 0, col: 0 }
    let goalPos = { row: 0, col: 0 }
    for (const row of tiles) {
      for (const tile of row) {
        if (tile.type === TileType.Spawn) spawnPos = { row: tile.row, col: tile.col }
        if (tile.type === TileType.Goal) goalPos = { row: tile.row, col: tile.col }
      }
    }

    const oldWaypoints: any[] = data.waypoints || []
    // If no spawn tile found, use first waypoint
    if (oldWaypoints.length > 0 && !tiles.some((r: any[]) => r.some((t: any) => t.type === TileType.Spawn))) {
      spawnPos = { row: oldWaypoints[0].row, col: oldWaypoints[0].col }
    }
    // If no goal tile found, use last waypoint
    if (oldWaypoints.length > 0 && !tiles.some((r: any[]) => r.some((t: any) => t.type === TileType.Goal))) {
      goalPos = { row: oldWaypoints[oldWaypoints.length - 1].row, col: oldWaypoints[oldWaypoints.length - 1].col }
    }

    const route: Route = {
      color: ROUTE_COLORS[0],
      spawn: spawnPos,
      goal: goalPos,
      waypoints: oldWaypoints.slice(1, -1).map((wp: any) => ({ row: wp.row, col: wp.col })),
    }

    return {
      ...data,
      tiles,
      routes: [route],
      waves: (data.waves || []).map((w: any) => ({ ...w, routeIndex: w.routeIndex ?? 0 })),
      startingDP: data.startingDP ?? 30,
      dpRegenRate: data.dpRegenRate ?? 1,
      dpCap: data.dpCap ?? 99,
      deploymentLimit: data.deploymentLimit ?? 8,
      lives: data.lives ?? 10,
    }
  }

  private migrateTileType(type: string): TileType {
    return migrateTileTypeStatic(type)
  }
  ```

  Add the static helper outside the class or in GridMath:
  ```typescript
  function migrateTileTypeStatic(type: string): TileType {
    switch (type) {
      case 'deploy_ground': return TileType.Ground
      case 'deploy_ranged': return TileType.Ranged
      case 'route': return TileType.Ground
      case 'spawn': return TileType.Spawn
      case 'goal': return TileType.Goal
      default: return type as TileType
    }
  }
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add src/entities/Grid.ts
  git commit -m "feat: refactor Grid for route-free tile system, 6-tile rendering"
  ```

---

### Task 4: Remove RouteGenerator

**Files:**
- Delete: `src/systems/RouteGenerator.ts`

- [ ] **Step 1: Delete the file**

  No replacement needed — routes are waypoint-defined.

- [ ] **Step 2: Commit**

  ```bash
  git rm src/systems/RouteGenerator.ts
  git commit -m "refactor: remove RouteGenerator (routes are waypoint-defined)"
  ```

---

### Task 5: Update Enemy.ts

**Files:**
- Modify: `src/entities/Enemy.ts`

- [ ] **Step 1: Update constructor — keep `grid`, replace `waypoints` with `path`**

  EnemySprite still needs `grid` for pixel↔tile conversion in `getCurrentTile()` and blocking. Replace the old `waypoints` field with `path` (the full ordered path from spawn → waypoints → goal).

  ```typescript
  export class EnemySprite {
    // ... existing fields ...
    path: Position[]  // full path [spawn, waypoints..., goal]

    constructor(scene: Phaser.Scene, config: EnemyConfig, path: Position[], grid: Grid) {
      // ... existing init (keep grid for pixelToTile) ...
      this.path = path
      this.grid = grid  // keep grid reference
      this.currentWaypoint = 0
      const start = path[0]
      this.x = start.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
      this.y = start.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y
    }
  ```

  The full path `[route.spawn, ...route.waypoints, route.goal]` is constructed by EnemyManager before passing to EnemySprite.

- [ ] **Step 2: Update move() to use path array**

  ```typescript
  move(delta: number): void {
    if (this.currentWaypoint >= this.path.length || !this.alive) return

    const target = this.path[this.currentWaypoint]
    const targetX = target.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
    const targetY = target.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y

    const dx = targetX - this.x
    const dy = targetY - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const speed = this.config.speed * delta / 1000

    if (distance < speed) {
      this.x = targetX
      this.y = targetY
      this.currentWaypoint++
    } else {
      this.x += (dx / distance) * speed
      this.y += (dy / distance) * speed
      this.container.setRotation(Math.atan2(dy, dx))
    }
  }
  ```

- [ ] **Step 3: Update isAtObjective()**

  ```typescript
  isAtObjective(): boolean {
    return this.currentWaypoint >= this.path.length
  }
  ```

- [ ] **Step 4: Update getCurrentTile()**

  No change needed — it derives tile from x/y position.

- [ ] **Step 5: Commit**

  ```bash
  git add src/entities/Enemy.ts
  git commit -m "feat: Enemy uses path array (spawn → waypoints → goal)"
  ```

---

### Task 6: Update DeploymentSystem.ts

**Files:**
- Modify: `src/systems/DeploymentSystem.ts`

- [ ] **Step 1: Update canDeploy for new tile types**

  ```typescript
  canDeploy(row: number, col: number, unitConfig: UnitConfig): string | null {
    const tile = this.grid.getTile(row, col)
    if (!tile) return 'Out of bounds'

    // Ground units deploy on ground tiles, ranged on ranged tiles
    if (unitConfig.type === 'ground' && tile.type !== TileType.Ground) return 'Ground units need ground tiles'
    if (unitConfig.type === 'ranged' && tile.type !== TileType.Ranged) return 'Ranged units need ranged tiles'

    // Check occupancy
    const key = `${row},${col}`
    if (this.activeUnits.has(key)) return 'Tile occupied'

    // Check deployment limit
    if (this.activeUnits.size >= this.deploymentLimit) return 'Deployment limit reached'

    // Check DP
    if (this.currentDp < unitConfig.dpCost) return 'Not enough DP'

    return null
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/systems/DeploymentSystem.ts
  git commit -m "feat: update DeploymentSystem for ground/ranged tile types"
  ```

---

### Task 7: Update EnemyManager for Multi-Route

**Files:**
- Modify: `src/systems/EnemyManager.ts`

- [ ] **Step 1: Add routes storage**

  ```typescript
  export class EnemyManager {
    // ... existing fields ...
    private routes: Route[] = []

    setWaves(waves: Wave[], routes: Route[], lives: number): void {
      this.waves = [...waves]
      this.routes = routes
      this.lives = lives
      this.currentWaveIndex = 0
      this.battleOver = false
      this.allWavesComplete = false
    }
  ```

- [ ] **Step 2: Update spawnEnemy to use route waypoints**

  ```typescript
  spawnEnemy(config: EnemyConfig, route: Route): void {
    const path = [route.spawn, ...route.waypoints, route.goal]
    const enemy = new EnemySprite(this.scene, config, path, this.grid)
    this.enemies.push(enemy)
  }
  ```

  EnemyManager already has a `grid` field — pass it to the EnemySprite constructor.

- [ ] **Step 3: Update startNextWave to extract route**

  ```typescript
  startNextWave(): void {
    if (this.currentWaveIndex >= this.waves.length) {
      this.allWavesComplete = true
      return
    }
    const wave = this.waves[this.currentWaveIndex]
    this.currentWave = wave
    this.currentEntryIndex = 0
    this.entrySpawnTimer = 0
    this.entrySpawned = 0
    this.battleActive = true

    const route = this.routes[wave.routeIndex]
    if (!route) {
      console.error(`Route index ${wave.routeIndex} not found`)
      return
    }
    this.currentRoute = route
  }
  ```

- [ ] **Step 4: Update spawn timing to use route spawn position**

  In `updateWaveSpawn`, when creating an enemy, pass `this.currentRoute`:
  ```typescript
  updateWaveSpawn(delta: number): void {
    if (!this.battleActive || !this.currentWave || !this.currentRoute) return
    // ... existing timer logic ...
    this.spawnEnemy(config, this.currentRoute!)
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/systems/EnemyManager.ts
  git commit -m "feat: multi-route spawning in EnemyManager"
  ```

---

### Task 8: Update EditorScene with Route Panel

**Files:**
- Modify: `src/scenes/EditorScene.ts`

This is the largest task. The editor needs:
- 6-tile palette (Ground, Floor, Ranged, Wall, Spawn, Goal)
- Route panel (Add Route, route list, select, delete)
- Per-route waypoint painting mode
- Spawn/goal tile linking (clicking a spawn/goal tile while route is selected)
- Wave panel route selector
- Validation UI (invalid route badges, disable Play)

- [ ] **Step 1: Update PALETTE_ITEMS to 6 types**

  ```typescript
  private readonly PALETTE_ITEMS = [
    TileType.Ground,
    TileType.Floor,
    TileType.Ranged,
    TileType.Wall,
    TileType.Spawn,
    TileType.Goal,
  ]
  ```

  Remove: Route, DeployGround, DeployRanged.

  Update `buildPalette()` to use the new list — the button rendering code from tile colors/labels already works via GridMath.

- [ ] **Step 2: Remove Spawn/Goal special-casing in handleClick**

  The old code had special logic for spawn/goal painting (limiting to one of each). Remove that — spawn/goal are now regular palette tiles.

  ```typescript
  handleClick(px: number, py: number): void {
    const tile = this.grid.pixelToTile(px, py)
    if (!tile) return

    if (this.editMode === 'erase') {
      this.grid.setTile(tile.row, tile.col, TileType.Ground)
      return
    }

    if (this.waypointMode) {
      // Waypoint painting for selected route
      this.handleWaypointClick(tile.row, tile.col)
      return
    }

    this.grid.setTile(tile.row, tile.col, this.selectedType)
  }
  ```

- [ ] **Step 3: Add route panel UI using Phaser DOMElement**

  Create `buildRoutePanel()` using the same DOM element pattern as ConfigPanel/WavePanel. The panel sits below or beside the config panel, positioned consistently with other editor panels:

  ```typescript
  buildRoutePanel(): void {
    const panel = this.add.dom(0, 0, document.createElement('div'))
    panel.setClassName('editor-panel')
    panel.setPosition(800, 180) // adjust position to fit
    const el = panel.node as HTMLDivElement
    el.id = 'route-panel'
    el.innerHTML = `
      <h3>ROUTES</h3>
      <button id="add-route-btn" class="editor-btn">+ Add Route</button>
      <div id="route-list"></div>
    `
    el.querySelector('#add-route-btn')!.addEventListener('click', () => this.addRoute())
    this.routePanel = panel
    this.renderRouteList()
  }
  ```

  `deleteRoute` shows a browser `confirm()` dialog before removing:
  ```typescript
  deleteRoute(index: number): void {
    if (this.routes.length <= 1) return
    if (!confirm(`Delete Route ${index + 1}?`)) return
    // ... splice, select previous, re-render ...
  }
  ```

- [ ] **Step 4: Add route CRUD methods**

  ```typescript
  private routes: Route[] = []
  private selectedRouteIndex: number = -1
  private nextRouteColorIndex: number = 0

  addRoute(): void {
    const color = ROUTE_COLORS[this.nextRouteColorIndex % ROUTE_COLORS.length]
    this.nextRouteColorIndex++
    this.routes.push({
      color,
      spawn: { row: 0, col: 0 },
      goal: { row: 0, col: 0 },
      waypoints: [],
    })
    this.selectedRouteIndex = this.routes.length - 1
    this.renderRouteList()
  }

  deleteRoute(index: number): void {
    if (this.routes.length <= 1) return
    this.routes.splice(index, 1)
    if (this.selectedRouteIndex >= this.routes.length) {
      this.selectedRouteIndex = this.routes.length - 1
    }
    this.renderRouteList()
  }

  selectRoute(index: number): void {
    this.selectedRouteIndex = index
    this.renderRouteList()
  }
  ```

- [ ] **Step 5: Add waypoint painting mode toggle**

  Replace the old "Paint Waypoints" toggle with a route-contextual waypoint mode. When a route is selected, you can toggle waypoint painting. When in waypoint mode, clicking on the grid adds waypoints to the selected route.

  Update the toolbar — use `makeButton` (the existing method used by other toolbar buttons):
  ```typescript
  // Replace old Paint Waypoints toggle — style matches other toolbar buttons
  const wpBtn = this.makeButton(140, 60, 120, 30, 'Waypoints', () => {
    if (this.selectedRouteIndex < 0) {
      this.flashMessage('Select a route first')
      return
    }
    this.waypointMode = !this.waypointMode
    wpBtn.setStyle({ backgroundColor: this.waypointMode ? '#ff6600' : '#444' })
  })
  ```

- [ ] **Step 6: Update waypoint painting with erase mode for removal**

  ```typescript
  handleWaypointClick(row: number, col: number): void {
    const route = this.routes[this.selectedRouteIndex]
    if (!route) return

    // Erase mode: remove a waypoint on click
    if (this.editMode === 'erase') {
      const idx = route.waypoints.findIndex(wp => wp.row === row && wp.col === col)
      if (idx >= 0) {
        route.waypoints.splice(idx, 1)
        this.renderRouteList()
      }
      return
    }

    const tile = this.grid.getTile(row, col)
    if (!tile) return

    // Clicking a spawn tile sets route spawn
    if (tile.type === TileType.Spawn) {
      route.spawn = { row, col }
      this.renderRouteList()
      return
    }

    // Clicking a goal tile sets route goal
    if (tile.type === TileType.Goal) {
      route.goal = { row, col }
      this.renderRouteList()
      return
    }

    // Add waypoint on any non-wall tile
    if (tile.type !== TileType.Wall) {
      route.waypoints.push({ row, col })
      this.renderRouteList()
    }
  }
  ```

- [ ] **Step 7: Update toolbar — remove auto-route, remove `generateWaypoints()`**

  Remove the "Auto Route" button and the `generateWaypoints()` method (which called RouteGenerator BFS).
  Remove `import { generateRoute }` from RouteGenerator at the top of EditorScene.
  Remove "Clear Route" button. Add "Clear Waypoints" button for the selected route.

  Keep: Clear Grid, Export, Import, Erase toggle, Play, Test Combat, grid resize.

- [ ] **Step 8: Pass routes to WavePanel and add route selector**

  WavePanel needs access to the routes array to render the dropdown. Pass a reference via a new method `setRoutes(routes)`:

  ```typescript
  class WavePanel {
    private routes: Route[] = []

    setRoutes(routes: Route[]): void {
      this.routes = routes
      this.render()
    }
  ```

  In `buildWavePanel()` or `render()`, each wave row shows a route selector:
  ```html
  <select class="route-select" data-wave-index="${wi}">
    ${this.routes.map((r, i) =>
      `<option value="${i}" ${i === wave.routeIndex ? 'selected' : ''}>Route ${i + 1}</option>`
    ).join('')}
  </select>
  ```

  Add event listener:
  ```typescript
  panel.querySelectorAll('.route-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const wi = parseInt((e.target as HTMLElement).dataset.waveIndex!)
      this.waves[wi].routeIndex = parseInt((e.target as HTMLSelectElement).value)
    })
  })
  ```

  In EditorScene, call `this.wavePanel.setRoutes(this.routes)` after any route change (add/delete).

  Also update WavePanel `load(waves)` to set `routeIndex: 0` as default on waves that lack it:
  ```typescript
  load(waves: Wave[]): void {
    this.waves = waves.map(w => ({ ...w, routeIndex: w.routeIndex ?? 0 }))
    this.render()
  }
  ```

- [ ] **Step 9: Update validation — spawn/goal existence + routeIndex check**

  Before building LevelData, validate all routes and wave references:
  ```typescript
  areRoutesValid(): boolean {
    if (this.routes.length === 0) return false

    // Check each route: path continuity + spawn/goal tiles exist on grid
    for (const route of this.routes) {
      if (!validateRoutePath(route)) return false

      // Verify the spawn and goal tiles exist at the referenced positions
      const spawnTile = this.grid.getTile(route.spawn.row, route.spawn.col)
      const goalTile = this.grid.getTile(route.goal.row, route.goal.col)
      if (!spawnTile || spawnTile.type !== TileType.Spawn) return false
      if (!goalTile || goalTile.type !== TileType.Goal) return false
    }

    // Check all waves reference valid route indices
    const waves = this.wavePanel.getWaves()
    for (const wave of waves) {
      if (wave.routeIndex < 0 || wave.routeIndex >= this.routes.length) return false
    }

    return true
  }
  ```

  Disable Play button if routes are invalid. Show red "!!" badge on invalid routes in route list.
  When a route is invalid, scan the path for the break point and highlight the gap tile on the grid with a pulsing red overlay.

- [ ] **Step 10: Update buildLevelData to include routes**

  ```typescript
  buildLevelData(): LevelData {
    return {
      name: this.configPanel.getName(),
      cols: this.grid.cols,
      rows: this.grid.rows,
      tiles: this.grid.tiles,
      routes: this.routes,
      waves: this.wavePanel.getWaves(),
      startingDP: this.configPanel.getStartingDP(),
      dpRegenRate: this.configPanel.getDpRegenRate(),
      dpCap: this.configPanel.getDpCap(),
      deploymentLimit: this.configPanel.getDeploymentLimit(),
      lives: this.configPanel.getLives(),
    }
  }
  ```

- [ ] **Step 10b: Render route paths on the grid (colored arrows)**

  When a route is selected, render its path on the grid: spawn (circle), waypoints (small dots), goal (diamond), with directional arrows between consecutive points. Use the route's `color` value. This happens outside the grid's render — draw Phaser Graphics objects in the editor scene.

  ```typescript
  drawRoutePreview(): void {
    if (this.routePreviewGraphics) this.routePreviewGraphics.clear()

    const route = this.routes[this.selectedRouteIndex]
    if (!route) return

    const g = this.routePreviewGraphics
    const path = [route.spawn, ...route.waypoints, route.goal]

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1]
      const curr = path[i]
      const x1 = curr.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
      const y1 = curr.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y
      const x0 = prev.col * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_X
      const y0 = prev.row * TILE_SIZE + TILE_SIZE / 2 + GRID_OFFSET_Y

      // Line
      g.lineStyle(3, route.color, 0.7)
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.strokePath()

      // Arrowhead
      const angle = Math.atan2(y1 - y0, x1 - x0)
      g.fillStyle(route.color, 0.7)
      g.fillTriangle(
        x1, y1,
        x1 - 10 * Math.cos(angle - 0.4), y1 - 10 * Math.sin(angle - 0.4),
        x1 - 10 * Math.cos(angle + 0.4), y1 - 10 * Math.sin(angle + 0.4),
      )
    }
  }
  ```

  Initialize `this.routePreviewGraphics = this.add.graphics()` in create(). Call `drawRoutePreview()` after any route change (waypoint add/remove, selection change, spawn/goal change). Clear previous graphics before redrawing.

  For gap highlighting on invalid routes: when a route is invalid, find the first broken pair in the path adjacency check and draw a red X over both tiles.

- [ ] **Step 11: Inject route panel CSS styles**

  Add to `injectEditorStyles()`:
  ```css
  #route-panel { ... }
  .route-item { display: flex; align-items: center; padding: 4px; cursor: pointer; }
  .route-item.selected { background: #555; }
  .route-swatch { width: 16px; height: 16px; border-radius: 3px; margin-right: 8px; }
  .route-invalid { color: #ff4444; font-weight: bold; margin-left: auto; }
  ```

- [ ] **Step 12: Commit**

  ```bash
  git add src/scenes/EditorScene.ts
  git commit -m "feat: multi-route editor with 6-tile palette, route panel, per-route waypoints"
  ```

---

### Task 9: Update GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Pass routes to EnemyManager**

  ```typescript
  loadLevel(data: LevelData): void {
    // ... existing reset logic ...
    this.grid.fromLevelData(data)
    this.enemyManager.setWaves(data.waves, data.routes, data.lives)
    // ...
  }
  ```

- [ ] **Step 2: Update facing logic for multi-route**

  ```typescript
  // In deployment, compute facing toward the nearest goal across all routes
  getAllGoals(routes: Route[]): Position[] {
    return routes.map(r => r.goal)
  }
  ```

  When a unit is deployed, `computeFacingTowardGoal` receives all route goals.

- [ ] **Step 3: Ensure spawn/goal tiles render visually during deployment phase**

  The grid renderer already draws spawn and goal tiles with their colors/labels. Keep this visible during the deployment phase before battle starts.

- [ ] **Step 4: Commit**

  ```bash
  git add src/scenes/GameScene.ts
  git commit -m "feat: GameScene multi-route support, pass routes to EnemyManager"
  ```

---

### Task 10: Update Test Level

**Files:**
- Modify: `src/levels/testLevel.ts`

- [ ] **Step 1: Rewrite test level with 6-tile types and multi-route format**

  ```typescript
  import { LevelData, TileType } from '../types'

  export const testLevel: LevelData = {
    name: 'Test Level',
    cols: 12,
    rows: 8,
    tiles: Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => {
        // Edge walls
        if (r === 0 || r === 7 || c === 0 || c === 11) return { row: r, col: c, type: TileType.Wall }
        // Route across row 3
        if (r === 3) {
          if (c === 1) return { row: r, col: c, type: TileType.Spawn }
          if (c === 10) return { row: r, col: c, type: TileType.Goal }
          return { row: r, col: c, type: TileType.Ground }
        }
        // Ranged tiles above and below route
        if (r === 2 || r === 4) return { row: r, col: c, type: TileType.Ranged }
        // Ground everywhere else
        return { row: r, col: c, type: TileType.Ground }
      })
    ),
    routes: [
      {
        color: 0xff4444,
        spawn: { row: 3, col: 1 },
        goal: { row: 3, col: 10 },
        waypoints: [
          { row: 3, col: 2 },
          { row: 3, col: 3 },
          { row: 3, col: 4 },
          { row: 3, col: 5 },
          { row: 3, col: 6 },
          { row: 3, col: 7 },
          { row: 3, col: 8 },
          { row: 3, col: 9 },
        ],
      },
    ],
    waves: [
      {
        routeIndex: 0,
        preludeDuration: 3,
        entries: [
          { enemyType: 'scout', count: 6, spawnInterval: 1.5 },
        ],
      },
      {
        routeIndex: 0,
        preludeDuration: 5,
        entries: [
          { enemyType: 'apc', count: 3, spawnInterval: 2.0 },
        ],
      },
      {
        routeIndex: 0,
        preludeDuration: 8,
        entries: [
          { enemyType: 'tank', count: 2, spawnInterval: 3.0 },
        ],
      },
    ],
    startingDP: 30,
    dpRegenRate: 1,
    dpCap: 99,
    deploymentLimit: 8,
    lives: 10,
  }
  ```

- [ ] **Step 2: Update LevelSerializer to migrate legacy format on import**

  Check `src/editor/LevelSerializer.ts` — the `routes` field serializes automatically since it's part of LevelData. On import, detect old format (no `routes`) and call `Grid.migrateLevelData()`:

  ```typescript
  // In deserializeLevel or importLevelFromFile
  import { Grid } from '../entities/Grid'

  function importLevelFromFile(): void {
    // ... read JSON ...
    if (!data.routes) {
      data = Grid.migrateLevelData(data)
    }
    // ... load into editor ...
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/levels/testLevel.ts
  git commit -m "feat: update test level to 6-tile multi-route format"
  ```

---

### Verification

After all tasks, run the full gate:

```bash
npm run lint
npm run typecheck
npm run build
```

Fix any errors found.

### Plan Notes
- Tasks 1-4 are foundation (types, utilities, grid, removal of old system)
- Tasks 5-7 are game systems (Enemy, DeploymentSystem, EnemyManager)
- Task 8 is the largest (EditorScene rewrite of palette + route panel)
- Task 9 ties it together in GameScene
- Task 10 updates test data
