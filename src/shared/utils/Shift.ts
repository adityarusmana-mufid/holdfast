/**
 * Converts Arknights-style shift force into Holdfast's discrete tile movement.
 * A target moves at least one tile when force meets its weight; excess force
 * increases the distance, capped at three tiles for readable grid play.
 */
export function getShiftDistance(force: number, weight: number): number {
  const effectiveForce = force - weight
  if (effectiveForce < 0) return 0
  return Math.min(effectiveForce + 1, 3)
}
