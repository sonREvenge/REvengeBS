import { compatibleOptions, bounded } from '../runtime/options.js';

function spectator(name) {
  return {
    options: compatibleOptions({ count: bounded(69, 0, 99999, true) }),
    create(context, resources, initial) {
      context.spectators.set(name, initial);
      resources.own(() => context.spectators.set(name, null));
      return {
        configure(next) {
          context.spectators.set(name, next);
        },
      };
    },
  };
}
export const spec = spectator('spec');
export const brawltv = spectator('brawltv');
