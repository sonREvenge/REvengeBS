import { compatibleOptions } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';

export const camera = {
  options: compatibleOptions({
    mode: {
      default: 3,
      valid: (value) => typeof value === 'number' && Number.isFinite(value),
      convert: (value) => ((value | 0) === 6 ? 6 : 3),
    },
  }),
  create(context, resources, initial) {
    let config = initial,
      screen = null,
      original = 0,
      lastSeen = 0;
    context.hook(resources, 'BattleScreen__updateCameraParameters', {
      onEnter(args) {
        lastSeen = Date.now();
        if (!screen?.equals(args[0])) {
          screen = args[0];
          original = screen.add(o.BattleScreen_cameraMode).readS32();
        }
        screen.add(o.BattleScreen_cameraMode).writeS32(config.mode);
      },
    });
    resources.own(() => {
      if (screen && (context.screen?.equals(screen) || Date.now() - lastSeen < 2000))
        screen.add(o.BattleScreen_cameraMode).writeS32(original);
    });
    return {
      configure(next) {
        config = next;
      },
    };
  },
};
