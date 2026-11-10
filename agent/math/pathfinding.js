const signStep = (value) => Math.sign(value) * 104;

export function slideMove(origin, target, query) {
  const first = query(target);
  if (!first.code) return target;
  const dx = target.x - origin.x,
    dy = target.y - origin.y;
  if (Math.hypot(dx, dy) < 0.001) return { ...origin };
  const offset = (hit) => {
    let x = hit.x - origin.x,
      y = hit.y - origin.y;
    const distance = Math.hypot(x, y);
    if (distance >= 21) {
      x = Math.trunc(((distance - 20) * x) / distance);
      y = Math.trunc(((distance - 20) * y) / distance);
    }
    return { x, y, distance };
  };
  const hit = offset(first);
  if (hit.distance >= 300)
    return { x: Math.round(origin.x + hit.x), y: Math.round(origin.y + hit.y) };
  const near = { x: origin.x + hit.x, y: origin.y + hit.y };
  const side = (positive, negative, fallback) => {
    const a = query(positive).code,
      b = query(negative).code;
    return (!a && !b) || (a && b) ? signStep(fallback) : !b ? -104 : 104;
  };
  let x = 0,
    y = 0;
  if (first.code === 1 || first.code === 4) {
    if (Math.abs(dx) < 0.001 || Math.abs(dy / dx) > 2.5) {
      if (hit.y !== 0) {
        const shift = hit.y > 0 ? 200 : -200;
        x = side(
          { x: near.x + 100, y: near.y + shift },
          { x: near.x - 100, y: near.y + shift },
          hit.x,
        );
      } else x = signStep(hit.x);
    } else x = signStep(hit.x);
  } else if (Math.abs(dx) >= 0.001 && Math.abs(dx / dy) > 2.5 && hit.x !== 0) {
    const shift = hit.x > 0 ? 200 : -200;
    y = side({ x: near.x + shift, y: near.y + 100 }, { x: near.x + shift, y: near.y - 100 }, hit.y);
  } else y = signStep(hit.y);
  const candidate = { x: origin.x + x, y: origin.y + y },
    second = query(candidate);
  if (!second.code) return { x: Math.round(candidate.x), y: Math.round(candidate.y) };
  const adjusted = offset(second);
  return adjusted.distance >= 21
    ? { x: Math.round(origin.x + adjusted.x), y: Math.round(origin.y + adjusted.y) }
    : { ...origin };
}
