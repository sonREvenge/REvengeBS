import { sight } from './walls.js';

const circle = Array.from({ length: 32 }, (_, i) => [
  Math.cos((i * Math.PI) / 16),
  Math.sin((i * Math.PI) / 16),
]);
export function project(matrix, x, y) {
  const w = matrix[3] * x - matrix[7] * y + matrix[15];
  return w > 1e-6
    ? [
        (matrix[0] * x - matrix[4] * y + matrix[12]) / w,
        (matrix[1] * x - matrix[5] * y + matrix[13]) / w,
      ]
    : null;
}
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);

export function espGeometry(snapshot, grid, matrix, width, height, config) {
  const vertices = [];
  function segment(a, b, first, last = first) {
    if (a && b && vertices.length < 2048 * 6) vertices.push(...a, ...first, ...b, ...last);
  }
  function ring(character, radius, first, last, gradient) {
    const points = circle.map(([x, y]) =>
      project(matrix, character.x + x * radius, character.y + y * radius),
    );
    points.forEach((point, i) =>
      segment(
        point,
        points[(i + 1) % 32],
        gradient ? mix(first, last, i / 32) : first,
        gradient ? mix(first, last, (i + 1) / 32) : first,
      ),
    );
  }
  const targets = snapshot.enemies
    .map((enemy) => ({ enemy, point: project(matrix, enemy.x, enemy.y) }))
    .filter((row) => row.point && row.enemy.x !== -1 && row.enemy.y !== -1)
    .slice(0, 8);
  if (config.showEnemyRange)
    for (const { enemy } of targets)
      if (enemy.range > 0)
        ring(
          enemy,
          enemy.range,
          config.enemyRangeColor,
          config.enemyRangeColor2,
          config.enemyRangeGradient,
        );
  if (config.showOwnRange && snapshot.self.range > 0)
    ring(
      snapshot.self,
      snapshot.self.range,
      config.ownRangeColor,
      config.ownRangeColor2,
      config.ownRangeGradient,
    );
  const own = project(matrix, snapshot.self.x, snapshot.self.y);
  if (config.showEnemyBox)
    for (const { enemy, point } of targets) {
      if (own && sight(grid, snapshot.self, enemy))
        segment(
          own,
          point,
          config.enemyColor,
          config.enemyGradient ? config.enemyColor2 : config.enemyColor,
        );
      const [x, y] = point,
        points = [
          [x - 40 / width, y],
          [x + 40 / width, y],
          [x + 40 / width, y + 120 / height],
          [x - 40 / width, y + 120 / height],
        ];
      points.forEach((point, i) =>
        segment(
          point,
          points[(i + 1) % 4],
          config.enemyGradient
            ? mix(config.enemyColor, config.enemyColor2, i / 4)
            : config.enemyColor,
          config.enemyGradient
            ? mix(config.enemyColor, config.enemyColor2, ((i + 1) % 4) / 4)
            : config.enemyColor,
        ),
      );
    }
  return vertices;
}
