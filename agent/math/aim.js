export function predictAim(origin, target, shot, amount = 65) {
  let x = target.x,
    y = target.y;
  if (shot.live && shot.speed > 0 && amount > 0 && target.motionSpeed > 0 && target.speed > 0) {
    let time = Math.hypot(x - origin.x, y - origin.y) / shot.speed;
    if (target.motionSpeed * time > target.radius + shot.radius) {
      for (let pass = 0; pass < 3; pass++) {
        time = Math.min(1.15, Math.hypot(x - origin.x, y - origin.y) / shot.speed);
        x = target.x + (target.vx * time * amount) / 100;
        y = target.y + (target.vy * time * amount) / 100;
      }
    }
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    x = target.x;
    y = target.y;
  }
  const distance = Math.hypot(x - origin.x, y - origin.y),
    maximum = shot.range + target.radius;
  if (shot.range > 0 && distance > maximum && distance > 1) {
    x = origin.x + ((x - origin.x) * maximum) / distance;
    y = origin.y + ((y - origin.y) * maximum) / distance;
  }
  return { x: Math.round(x), y: Math.round(y) };
}
