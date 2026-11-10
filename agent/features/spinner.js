import { compatibleOptions, bounded, boolean } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';
import { sendMove } from './movement.js';

export const spinner = {
  options: compatibleOptions({
    speed: {
      default: null,
      valid: (v) => typeof v === 'number' && Number.isFinite(v),
      convert: (v) => Math.max(0, Math.min(100, v)),
    },
    radius: bounded(20, 20, 400, true),
    allowMoving: boolean(false),
  }),
  create(context, resources, initial) {
    let config = initial,
      phase = 0,
      generation = -1;
    context.subscribe(
      resources,
      (snapshot) => {
        if (generation !== snapshot.generation) {
          generation = snapshot.generation;
          phase = 0;
        }
      },
      { priority: 40, label: 'spinner' },
    );
    context.hook(resources, 'BattleScreen__updateMovement', {
      onEnter(args) {
        if (!context.fresh() || context.dodgeDirection) return;
        if (!config.allowMoving && args[0].add(o.BattleScreen_movePending).readU16()) return;
        phase =
          (phase + (config.speed === null ? Math.PI / 4 : 0.1 + (config.speed / 100) * 1.4)) %
          (Math.PI * 2);
        const snapshot = context.world.snapshot;
        sendMove(context, snapshot.battle, {
          x: snapshot.self.x + Math.cos(phase) * config.radius,
          y: snapshot.self.y + Math.sin(phase) * config.radius,
        });
      },
    });
    return {
      configure(next) {
        config = next;
      },
    };
  },
};
