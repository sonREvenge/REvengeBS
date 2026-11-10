export const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function closestApproach(position, velocity, horizon) {
  const speedSquared = velocity.x ** 2 + velocity.y ** 2;
  const time =
    speedSquared > 0
      ? Math.max(
          0,
          Math.min(horizon, -(position.x * velocity.x + position.y * velocity.y) / speedSquared),
        )
      : 0;
  return Math.hypot(position.x + velocity.x * time, position.y + velocity.y * time);
}

// Check both tiles when the line crosses a corner
export function clearSegment(grid, start, end, mask, size = 300) {
  if (!grid) return false;
  let x = Math.floor(start.x / size),
    y = Math.floor(start.y / size);
  const endX = Math.floor(end.x / size),
    endY = Math.floor(end.y / size);
  const blocked = (tx, ty) =>
    tx < 0 ||
    ty < 0 ||
    tx >= grid.width ||
    ty >= grid.height ||
    (grid.cells[ty * grid.width + tx] & mask) !== 0;
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const stepX = Math.sign(dx),
    stepY = Math.sign(dy);
  const deltaX = dx === 0 ? Infinity : size / Math.abs(dx);
  const deltaY = dy === 0 ? Infinity : size / Math.abs(dy);
  let nextX = dx === 0 ? Infinity : ((x + (stepX > 0 ? 1 : 0)) * size - start.x) / dx;
  let nextY = dy === 0 ? Infinity : ((y + (stepY > 0 ? 1 : 0)) * size - start.y) / dy;
  for (let i = 0; i <= grid.width + grid.height; i++) {
    if (blocked(x, y)) return false;
    if (x === endX && y === endY) return true;
    if (nextX === nextY) {
      if (blocked(x + stepX, y) || blocked(x, y + stepY)) return false;
      x += stepX;
      y += stepY;
      nextX += deltaX;
      nextY += deltaY;
    } else if (nextX < nextY) {
      x += stepX;
      nextX += deltaX;
    } else {
      y += stepY;
      nextY += deltaY;
    }
  }
  return false;
}
