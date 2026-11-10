import { compatibleOptions, boolean } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';
import { createLineRenderer } from '../native/graphics.js';
import { Resources } from '../runtime/resources.js';
import { espGeometry } from '../math/overlay.js';

const color = (fallback) => ({
  default: fallback,
  valid: (value) => !!value,
  convert: (value) => {
    if (!Array.isArray(value) || value.length < 3) return [...fallback];
    return [0, 1, 2, 3].map((index) =>
      index === 3 && value.length < 4 ? fallback[3] : Math.max(0, Math.min(1, +value[index] || 0)),
    );
  },
});

export const esp = {
  options: compatibleOptions({
    showEnemyBox: boolean(true),
    showOwnRange: boolean(true),
    showEnemyRange: boolean(true),
    enemyColor: color([1, 0.2, 0.2, 0.9]),
    enemyColor2: color([0.95, 0.2, 0.95, 0.9]),
    enemyGradient: boolean(false),
    ownRangeColor: color([0.2, 0.9, 0.95, 0.55]),
    ownRangeColor2: color([0.95, 0.2, 0.95, 0.55]),
    ownRangeGradient: boolean(false),
    enemyRangeColor: color([0, 0, 0, 0.6]),
    enemyRangeColor2: color([1, 0.2, 0.2, 0.6]),
    enemyRangeGradient: boolean(false),
  }),
  create(context, resources, initial) {
    let config = initial,
      closed = false,
      renderer = null,
      ownerContext = null;
    const retired = new Set();
    let finishCleanup = null;
    context.useWorld(resources);
    const subscription = new Resources();
    resources.own(() => {
      closed = true;
      if (!renderer && !retired.size) {
        subscription.close();
        return;
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          subscription.close();
          reject(
            new Error(
              'Overlay cleanup requires an active EGL frame; GPU objects remain until the context is destroyed',
            ),
          );
        }, 1000);
        finishCleanup = () => {
          clearTimeout(timer);
          subscription.close();
          resolve();
        };
      });
    });
    context.egl.subscribe(
      subscription,
      context.log.guard('overlay', function () {
        const current = context.egl.context();
        if (!current || current.isNull()) return;
        // Free each renderer on its original GL context
        for (const item of retired) {
          if (item.context.equals(current)) {
            item.renderer.dispose();
            retired.delete(item);
          }
        }
        if (closed) {
          if (renderer && ownerContext.equals(current)) {
            renderer.dispose();
            renderer = null;
          }
          if (!renderer && retired.size === 0) finishCleanup?.();
          return;
        }
        if (
          !context.world.snapshot ||
          Date.now() - context.world.snapshot.time > 1500 ||
          !context.screen ||
          Date.now() - context.screenAt > 2000
        )
          return;
        if (ownerContext && !ownerContext.equals(current)) {
          retired.add({ context: ownerContext, renderer });
          renderer = null;
        }
        if (!renderer) {
          renderer = createLineRenderer();
          ownerContext = current;
        }
        const matrix = new Float32Array(
          context.screen.add(o.BattleScreen_viewMatrix).readByteArray(64),
        );
        if (![...matrix].every(Number.isFinite)) return;
        const width = context.screen.add(o.BattleScreen_screenWidth).readFloat(),
          height = context.screen.add(o.BattleScreen_screenHeight).readFloat();
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
          return;
        renderer.draw(
          espGeometry(context.world.snapshot, context.world.grid, matrix, width, height, config),
        );
      }),
    );
    return {
      configure(next) {
        config = next;
      },
    };
  },
};
