import { compatibleOptions, bounded, boolean } from '../runtime/options.js';
import { createFpsLabel } from '../native/ui.js';

export function createFrameMeter() {
  const samples = [];
  let head = 0;
  return {
    reset() {
      samples.length = 0;
      head = 0;
    },
    sample(now) {
      samples.push(now);
      while (head < samples.length && now - samples[head] > 1000) head++;
      if (head > 1024) {
        samples.splice(0, head);
        head = 0;
      }
      return samples.length - head;
    },
  };
}
export const fps = {
  options: compatibleOptions({
    x: bounded(570, -200, 3000, true),
    y: bounded(80, -200, 3000, true),
    intervalMs: bounded(250, 50, 10000, true),
    telemetry: boolean(false),
  }),
  create(context, resources, initial) {
    let config = initial,
      lastEmit = Date.now(),
      generation = context.battleVersion;
    const meter = createFrameMeter();
    context.fpsLabel ??= createFpsLabel(context);
    resources.own(() => context.fpsLabel.hide());
    context.frame(
      resources,
      (now) => {
        if (generation !== context.battleVersion) {
          generation = context.battleVersion;
          meter.reset();
          lastEmit = now;
          context.fpsLabel.hide();
        }
        const value = meter.sample(now);
        if (now - lastEmit < config.intervalMs) return;
        lastEmit = now;
        context.fpsLabel.show('FPS: ' + value, config.x, config.y);
        if (config.telemetry) send({ type: 'FPS', data: value });
      },
      'fps',
    );
    return {
      configure(next) {
        config = next;
      },
    };
  },
};
