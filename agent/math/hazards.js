import { kinds, fits } from '../data/calibration.js';
import { canonicalName } from '../data/brawlers.js';
import { closestApproach } from './geometry.js';
import { sight, trace } from './walls.js';

const curve = [
  [0, 200, 0],
  [110, 515, 32],
  [207, 797, 216],
  [312, 999, 519],
  [411, 1066, 930],
  [513, 995, 1377],
  [557, 883, 1611],
];
const cross = {
  CrossBomberProjectile: [125, 200, 800, 1015],
  CrossBomberUltiProjectile: [375, 100, 1600, 1115],
};
const replaced = new Set(['CrossBomberProjectile', 'CrossBomberUltiProjectile', 'CactusSpike']);

export function segmentDistance(point, segment) {
  const dx = segment.bx - segment.ax,
    dy = segment.by - segment.ay,
    length = dx * dx + dy * dy;
  const ratio =
    length < 1e-6
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - segment.ax) * dx + (point.y - segment.ay) * dy) / length),
        );
  return Math.hypot(point.x - segment.ax - dx * ratio, point.y - segment.ay - dy * ratio);
}

export class DangerModel {
  variant = null;
  muted = new Set();
  ignoredKey = '';
  reset() {
    this.variant = null;
    this.muted.clear();
    this.ignoredKey = '';
  }
  destroyed(records) {
    for (const shot of records) {
      if (this.variant || shot.name !== 'CactusProjectile') continue;
      const dx = shot.x - shot.spawnX,
        dy = shot.y - shot.spawnY;
      if (dx * dx + dy * dy < 1) continue;
      const bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
      const difference = Math.abs(((((bearing - (shot.angle || 0)) % 360) + 540) % 360) - 180);
      this.variant = difference > 22 ? 'curve' : 'straight';
    }
  }
  shapes(shot, now, grid) {
    const profile = cross[shot.name];
    if (profile) {
      if (
        !Number.isFinite(shot.targetX) ||
        !Number.isFinite(shot.targetY) ||
        shot.targetX === 0 ||
        shot.targetY === 0 ||
        Math.abs(shot.targetX) > 1e6 ||
        Math.abs(shot.targetY) > 1e6
      )
        return null;
      const [radius, offset, travel, flight] = profile,
        arm = offset + travel;
      const land = (shot.spawnedAt || now) + flight,
        t0 = land - 50,
        t1 = land + (travel / 3000) * 1000 + 50;
      return [
        {
          ax: shot.targetX - arm,
          ay: shot.targetY,
          bx: shot.targetX + arm,
          by: shot.targetY,
          radius,
          t0,
          t1,
        },
        {
          ax: shot.targetX,
          ay: shot.targetY - arm,
          bx: shot.targetX,
          by: shot.targetY + arm,
          radius,
          t0,
          t1,
        },
      ];
    }
    if (shot.name === 'CactusSpike') return this.variant ? [] : null;
    if (shot.name !== 'CactusProjectile' || !this.variant) return null;
    const angle = ((shot.angle || 0) * Math.PI) / 180,
      direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const distance = trace(grid, { x: shot.spawnX, y: shot.spawnY }, direction, 2035, 0, 2);
    const x = shot.spawnX + direction.x * distance,
      y = shot.spawnY + direction.y * distance;
    const burst = (shot.spawnedAt || now) + (963 * distance) / 2035,
      result = [];
    if (shot.spawnAreaRadius > 0)
      result.push({
        x,
        y,
        radius: shot.spawnAreaRadius,
        t0: burst,
        t1: burst + (shot.spawnAreaActiveTime || 700),
      });
    if (this.variant === 'straight') {
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm * Math.PI) / 3,
          dx = Math.cos(angle) * 1300,
          dy = Math.sin(angle) * 1300;
        result.push({
          ax: x - dx,
          ay: y - dy,
          bx: x + dx,
          by: y + dy,
          radius: 50,
          t0: burst - 50,
          t1: burst + 410,
        });
      }
    } else
      for (let arm = 0; arm < 6; arm++) {
        const cosine = Math.cos((arm * Math.PI) / 3),
          sine = Math.sin((arm * Math.PI) / 3);
        for (let i = 0; i < curve.length - 1; i++) {
          const [ta, ax, ay] = curve[i],
            [tb, bx, by] = curve[i + 1];
          result.push({
            ax: x + ax * cosine - ay * sine,
            ay: y + ax * sine + ay * cosine,
            bx: x + bx * cosine - by * sine,
            by: y + bx * sine + by * cosine,
            radius: 50,
            t0: burst + ta,
            t1: burst + tb,
          });
        }
      }
    return result;
  }
  collect(snapshot, grid, margin, ignored) {
    const ignoredKey = JSON.stringify(ignored);
    if (ignoredKey !== this.ignoredKey) {
      this.muted.clear();
      this.ignoredKey = ignoredKey;
    }
    const live = new Set(snapshot.projectiles.map((shot) => shot.id));
    for (const id of this.muted) if (!live.has(id)) this.muted.delete(id);
    this.destroyed(snapshot.destroyed ?? []);
    const result = [],
      self = snapshot.self,
      pad = self.radius + margin * 2,
      now = snapshot.time;
    for (const shot of snapshot.projectiles) {
      if (ignored.includes(canonicalName(shot.ownerName))) this.muted.add(shot.id);
      if (this.muted.has(shot.id)) continue;
      const shaped = this.shapes(shot, now, grid);
      for (const shape of shaped ?? []) {
        if (shape.t1 <= now) continue;
        if (
          (shape.ax === undefined
            ? Math.hypot(self.x - shape.x, self.y - shape.y)
            : segmentDistance(self, shape)) > 3200
        )
          continue;
        result.push({
          ...shape,
          radius: shape.radius + pad,
          vx: 0,
          vy: 0,
          until: (shape.t1 - now) / 1000,
          segment: shape.ax === undefined ? null : shape,
        });
      }
      if (shaped && replaced.has(shot.name)) continue;
      const spec = kinds[shot.name] ?? {},
        fit = fits[spec.fit] ?? fits.fallback;
      if (spec.drop || Math.hypot(shot.x - self.x, shot.y - self.y) > 3200) continue;
      const flown =
        Number.isFinite(shot.spawnX) && Number.isFinite(shot.spawnY)
          ? Math.hypot(shot.x - shot.spawnX, shot.y - shot.spawnY)
          : 0;
      let vx = Number.isFinite(shot.vx) ? shot.vx : 0,
        vy = Number.isFinite(shot.vy) ? shot.vy : 0;
      if (spec.lockPath && flown > 120) {
        vx = ((shot.x - shot.spawnX) / flown) * (shot.speed || 1);
        vy = ((shot.y - shot.spawnY) / flown) * (shot.speed || 1);
      }
      if (spec.speedMul > 0 && Math.hypot(vx, vy) > 3500) {
        vx *= spec.speedMul;
        vy *= spec.speedMul;
      }
      const speed = Math.hypot(vx, vy),
        blob =
          !!spec.blob ||
          (!(spec.lockPath || shot.isBeam) &&
            (shot.indirect || (shot.speed > 0 && shot.speed < 1600)));
      const shotRadius = (shot.radius > 0 ? shot.radius : 100) + (spec.growR || 0);
      const radius = shotRadius + pad + fit.pad + shotRadius * fit.grow;
      let reach =
        spec.chargedRange > 0 && speed > 3500
          ? spec.chargedRange
          : spec.maxRange || shot.castRange || 0;
      if (reach <= 0 && shot.indirect && (shot.targetX || shot.targetY))
        reach = Math.hypot(shot.targetX - shot.spawnX, shot.targetY - shot.spawnY);
      reach = (reach || 2800) + (spec.reachAdj || 0);
      if (reach <= 0 || reach >= 70000) reach = 2800;
      let left = Math.max(0, reach - flown);
      const age = Math.max(0, now - (shot.spawnedAt || now));
      if (spec.fade) left = Math.max(0, reach * (1 - age / 1000));
      else if (spec.home) {
        const home =
          Number.isFinite(shot.ownerX) &&
          Number.isFinite(shot.ownerY) &&
          (shot.ownerX || shot.ownerY)
            ? { x: shot.ownerX, y: shot.ownerY }
            : shot.targetX || shot.targetY
              ? { x: shot.targetX, y: shot.targetY }
              : null;
        if (home) left = Math.hypot(home.x - shot.x, home.y - shot.y);
      }
      const along = speed > 0 ? ((self.x - shot.x) * vx + (self.y - shot.y) * vy) / speed : 0;
      if (!blob && speed >= 1) {
        if (along < -50 || along > left + shotRadius) continue;
        if (
          !shot.indirect &&
          !sight(grid, shot, {
            x: shot.x + (vx / speed) * Math.max(along, 0),
            y: shot.y + (vy / speed) * Math.max(along, 0),
          })
        )
          continue;
      }
      if (
        left <= 10 ||
        left < 0.85 * Math.max(0, Math.hypot(shot.x - self.x, shot.y - self.y) - pad - shotRadius)
      )
        continue;
      result.push({
        x: shot.x,
        y: shot.y,
        vx: blob ? 0 : vx,
        vy: blob ? 0 : vy,
        radius,
        left,
        pathLength: left + shotRadius,
        age,
        fadeBase: spec.fadeBase || 0,
        fadeK: spec.fadeK || 0,
      });
    }
    return result;
  }
}

export function clearance(hazards, origin, velocity, horizon = 1) {
  let result = Infinity;
  for (const hazard of hazards) {
    let maximum = horizon;
    if (hazard.until > 0) maximum = Math.min(maximum, hazard.until);
    if (hazard.segment) {
      for (let i = 0; i <= 4; i++) {
        const time = (maximum * i) / 4;
        result = Math.min(
          result,
          segmentDistance(
            { x: origin.x + velocity.x * time, y: origin.y + velocity.y * time },
            hazard.segment,
          ) - hazard.radius,
        );
      }
    } else {
      const speed = Math.hypot(hazard.vx, hazard.vy);
      if (speed > 1) {
        if (hazard.left > 0) maximum = Math.min(maximum, hazard.left / speed);
        if (hazard.pathLength > 0) maximum = Math.min(maximum, hazard.pathLength / speed);
      }
      result = Math.min(
        result,
        closestApproach(
          { x: hazard.x - origin.x, y: hazard.y - origin.y },
          { x: hazard.vx - velocity.x, y: hazard.vy - velocity.y },
          maximum,
        ) - hazard.radius,
      );
    }
  }
  return result;
}
