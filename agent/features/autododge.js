import { compatibleOptions, bounded, names } from '../runtime/options.js';
import { DangerModel, clearance } from '../math/hazards.js';
import { blocked, clampPoint } from '../math/walls.js';
import { sendMove } from './movement.js';

export function createDodgePlanner() {
  const model = new DangerModel();
  let heading = null,
    index = -1,
    holdUntil = 0,
    dangerAt = 0,
    nextAt = 0,
    generation = -1,
    count = 0,
    directions = [],
    scores = new Float64Array(0);
  function reset() {
    model.reset();
    heading = null;
    index = -1;
    holdUntil = dangerAt = nextAt = 0;
  }
  return {
    reset,
    get direction() {
      return heading;
    },
    update(snapshot, grid, config) {
      if (snapshot.generation !== generation) {
        reset();
        generation = snapshot.generation;
      }
      if (count !== config.directionPrecision) {
        count = config.directionPrecision;
        directions = Array.from({ length: count }, (_, i) => ({
          x: Math.cos((i * Math.PI * 2) / count),
          y: Math.sin((i * Math.PI * 2) / count),
        }));
        scores = new Float64Array(count);
        heading = null;
        index = -1;
      }
      const reaction = config.reactionSpeed / 100,
        interval = config.intervalMs || Math.max(16, Math.round(32 - reaction * 16));
      if (snapshot.time < nextAt) return null;
      nextAt = snapshot.time + interval;
      const threats = model.collect(snapshot, grid, config.safetyMargin, config.ignoredBrawlers);
      if (!threats.length) {
        if (heading && snapshot.time - dangerAt > 120) {
          heading = null;
          index = -1;
        }
        return null;
      }
      const self = snapshot.self,
        horizon = config.horizon,
        stay = clearance(threats, self, { x: 0, y: 0 }, horizon);
      if (stay < 40) dangerAt = snapshot.time;
      if (stay >= 40 && (!heading || snapshot.time - dangerAt > 120)) {
        heading = null;
        index = -1;
        return null;
      }
      let chosen = 0,
        bestScore = -Infinity;
      for (let i = 0; i < directions.length; i++) {
        const direction = directions[i];
        let value = clearance(
          threats,
          self,
          { x: direction.x * self.speed, y: direction.y * self.speed },
          horizon,
        );
        for (let probe = 1; probe <= 3; probe++)
          if (
            blocked(
              grid,
              {
                x: self.x + direction.x * self.speed * 0.35 * probe,
                y: self.y + direction.y * self.speed * 0.35 * probe,
              },
              240,
            )
          )
            value -= 9000 * (4 - probe);
        if (heading) value += 100 * (direction.x * heading.x + direction.y * heading.y);
        scores[i] = value;
        if (value > bestScore) {
          bestScore = value;
          chosen = i;
        }
      }
      const lock = Math.max(80, Math.round(260 - reaction * 180));
      if (
        index >= 0 &&
        snapshot.time < holdUntil &&
        chosen !== index &&
        scores[index] + 120 >= scores[chosen]
      )
        chosen = index;
      else if (snapshot.time >= holdUntil || chosen !== index) holdUntil = snapshot.time + lock;
      if (scores[chosen] <= stay) {
        heading = null;
        index = -1;
        return null;
      }
      index = chosen;
      heading = directions[chosen];
      return clampPoint(grid, { x: self.x + heading.x * 600, y: self.y + heading.y * 600 });
    },
  };
}

export const autododge = {
  options: compatibleOptions({
    reactionSpeed: bounded(50, 0, 100),
    directionPrecision: bounded(48, 8, 128, true),
    safetyMargin: bounded(25, 0, 120),
    ignoredBrawlers: names(),
    horizon: bounded(1, 0.1, 2),
    intervalMs: {
      default: 0,
      valid: (value) => typeof value === 'number' && Number.isFinite(value),
      convert: (value) => Math.max(16, Math.min(200, value | 0)),
    },
  }),
  create(context, resources, initial) {
    let config = initial;
    const planner = createDodgePlanner();
    resources.own(() => {
      context.dodgeDirection = null;
      planner.reset();
    });
    context.subscribe(
      resources,
      (snapshot) => {
        const target = planner.update(snapshot, context.world.grid, config);
        context.dodgeDirection = planner.direction;
        if (target && !context.speedhackActive) sendMove(context, snapshot.battle, target);
      },
      { projectiles: true, priority: 30, label: 'autododge' },
    );
    return {
      configure(next) {
        config = next;
      },
    };
  },
};
