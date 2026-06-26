import { Route, Tile, Position, FlowDirection, RouteMode } from '../types/index'
import { Grid } from '../entities/Grid'
import { computeFlowFieldToRoute, posKey, FlowFieldResult } from '../shared/utils/GridMath'

export class PathSystem {
  private grid: Grid
  private routes: Route[]
  private tiles: Tile[][]
  private rows: number
  private cols: number

  private currentFlowField: FlowFieldResult | null = null
  private blockedTiles: Set<string> = new Set()
  private routeMode: RouteMode = 'fixed'

  constructor(grid: Grid, routes: Route[], tiles: Tile[][], rows: number, cols: number) {
    this.grid = grid
    this.routes = routes
    this.tiles = tiles
    this.rows = rows
    this.cols = cols
    this.recompute()
  }

  setRouteMode(mode: RouteMode): void {
    this.routeMode = mode
    if (mode === 'dynamic') {
      this.recompute()
    }
  }

  getRouteMode(): RouteMode {
    return this.routeMode
  }

  isDynamic(): boolean {
    return this.routeMode === 'dynamic'
  }

  getFlowDirection(pos: Position): FlowDirection {
    if (!this.currentFlowField) return null
    const key = posKey(pos)
    return this.currentFlowField.directions.get(key) ?? null
  }

  isReachable(pos: Position): boolean {
    if (!this.currentFlowField) return false
    const key = posKey(pos)
    return this.currentFlowField.reachable.has(key)
  }

  addBlockedTile(row: number, col: number): void {
    this.blockedTiles.add(`${row},${col}`)
    this.recompute()
  }

  removeBlockedTile(row: number, col: number): void {
    this.blockedTiles.delete(`${row},${col}`)
    this.recompute()
  }

  isBlocked(row: number, col: number): boolean {
    return this.blockedTiles.has(`${row},${col}`)
  }

  getBlockedTiles(): ReadonlySet<string> {
    return this.blockedTiles
  }

  private recompute(): void {
    if (this.routeMode !== 'dynamic') {
      this.currentFlowField = null
      return
    }

    const routeTiles = this.collectRouteTiles()
    this.currentFlowField = computeFlowFieldToRoute(
      this.routes,
      this.tiles,
      this.blockedTiles,
      this.rows,
      this.cols
    )
  }

  private collectRouteTiles(): Position[] {
    const tiles: Position[] = []
    for (const route of this.routes) {
      tiles.push(route.spawn, ...route.waypoints, route.goal)
    }
    return tiles
  }

  getNextWaypoint(enemyPos: Position, currentWaypoint: number, routeIndex: number): Position | null {
    const route = this.routes[routeIndex]
    if (!route) return null
    const waypoints = [route.spawn, ...route.waypoints, route.goal]
    if (currentWaypoint + 1 >= waypoints.length) return null
    return waypoints[currentWaypoint + 1]
  }
}