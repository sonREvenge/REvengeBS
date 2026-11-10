import { compatibleOptions, bounded } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';
import { valid } from '../native/bindings.js';

const restoreFps = (value) => (Number.isFinite(value) && value > 0 && value <= 9999 ? value : 60);

export const fpsunlock = {
  options: compatibleOptions({ target: bounded(9999, 30, 9999, true) }),
  create(context, resources, initial) {
    let config = initial,
      manager = null,
      display = null,
      interval = -1;
    const target = context.base.add(o.FramerateManager_targetFps),
      original = restoreFps(target.readDouble());
    let originals = null;
    function capture(pointer) {
      if (!valid(pointer)) return;
      if (!manager?.equals(pointer)) {
        manager = pointer;
        originals = [restoreFps(manager.readDouble()), restoreFps(manager.add(328).readDouble())];
      }
    }
    function apply() {
      target.writeDouble(config.target);
      if (manager) {
        manager.writeDouble(config.target);
        manager.add(328).writeDouble(config.target);
      }
    }
    context.hook(resources, 'FramerateManager__setSegment', {
      onEnter(args) {
        capture(args[0]);
        args[1] = ptr(2);
      },
      onLeave() {
        apply();
      },
    });
    context.hook(resources, 'FramerateManager__setLimit', {
      onEnter(args) {
        capture(args[0]);
        apply();
      },
      onLeave() {
        apply();
      },
    });
    context.egl.subscribe(resources, (dpy) => {
      display = dpy;
      apply();
      if (interval !== 0) {
        if (context.egl.interval(dpy, 0)) interval = 0;
      }
    });
    resources.interval(context.log.guard('fps unlock', apply), 250);
    resources.own(() => {
      target.writeDouble(original);
      if (manager && originals) {
        manager.writeDouble(originals[0]);
        manager.add(328).writeDouble(originals[1]);
      }
      if (display) context.egl.interval(display, 1);
    });
    apply();
    return {
      configure(next) {
        config = next;
        apply();
      },
    };
  },
};
