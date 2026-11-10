import { clearSegment } from './geometry.js';

export const sight = (grid, a, b) => !grid || clearSegment(grid, a, b, 2);
function tileBlocked(grid, x, y, mask) {
  const column = Math.trunc(x / 300),
    row = Math.trunc(y / 300);
  return (
    column >= 0 &&
    row >= 0 &&
    column < grid.width &&
    row < grid.height &&
    !!(grid.cells[row * grid.width + column] & mask)
  );
}
export function blocked(grid, point, radius = 0, mask = 1) {
  if (!grid) return false;
  return (
    tileBlocked(grid, point.x, point.y, mask) ||
    (radius > 0 &&
      (tileBlocked(grid, point.x + radius, point.y, mask) ||
        tileBlocked(grid, point.x - radius, point.y, mask) ||
        tileBlocked(grid, point.x, point.y + radius, mask) ||
        tileBlocked(grid, point.x, point.y - radius, mask)))
  );
}
export function trace(grid, origin, direction, distance, radius = 0, mask = 1) {
  if (!grid || distance <= 0) return distance;
  for (let step = 40; ; step += 40) {
    const at = Math.min(step, distance);
    const point = { x: origin.x + direction.x * at, y: origin.y + direction.y * at };
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= grid.width * 300 ||
      point.y >= grid.height * 300 ||
      blocked(grid, point, radius, mask)
    )
      return Math.max(0, at - 75);
    if (at === distance) return distance;
  }
}
export function clampPoint(grid, point) {
  return {
    x: Math.round(grid ? Math.max(0, Math.min(grid.width * 300 - 1, point.x)) : point.x),
    y: Math.round(grid ? Math.max(0, Math.min(grid.height * 300 - 1, point.y)) : point.y),
  };
}
