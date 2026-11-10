import { waitForEngine } from '../native/module.js';
import { createBindings, valid } from '../native/bindings.js';
import { createInput } from '../native/input.js';
import { offsets as o } from '../native/layout.js';
import { World } from '../native/world.js';
import { Combat } from '../native/combat.js';
import { createEgl } from '../native/egl.js';
import { createSpectators } from '../native/ui.js';

export async function openSession(resources, log) {
  const module = await waitForEngine(resources);
  const base = module.base;
  const native = createBindings(base);
  const world = new World(base, native);
  const ticks = new Map();
  let orderedTicks = [],
    scanning = false;
  const orderTicks = () => {
    orderedTicks = [...ticks.values()].sort((a, b) => a.priority - b.priority);
  };
  const frames = new Map();
  let lastBattle = null;
  const context = {
    base,
    native,
    world,
    log,
    input: createInput(base, native),
    screen: null,
    screenAt: 0,
    projectileUsers: 0,
    combatUsers: 0,
    worldUsers: 0,
    battleVersion: 0,
    useWorld(owner, { projectiles = false, combat = false } = {}) {
      owner.own(() => {
        context.worldUsers--;
        if (projectiles) context.projectileUsers--;
        if (combat && --context.combatUsers === 0) context.combat.reset();
      });
      context.worldUsers++;
      if (projectiles) context.projectileUsers++;
      if (combat) context.combatUsers++;
    },
    subscribe(owner, callback, options = {}) {
      const { priority = 50, label = 'feature tick' } = options;
      context.useWorld(owner, options);
      owner.own(() => {
        ticks.delete(callback);
        orderTicks();
      });
      ticks.set(callback, { callback, priority, label });
      orderTicks();
    },
    frame(owner, callback, label = 'frame callback') {
      owner.own(() => frames.delete(callback));
      frames.set(callback, label);
    },
    hook(owner, name, callbacks) {
      const guarded = Object.fromEntries(
        Object.entries(callbacks).map(([phase, callback]) => [
          phase,
          log.guard(`${name}.${phase}`, callback),
        ]),
      );
      return owner.attach(base.add(o[name]), guarded);
    },
    fresh() {
      return world.snapshot && Date.now() - world.snapshot.time < 200;
    },
  };
  context.combat = new Combat(context);
  context.egl = createEgl(resources, log);
  context.spectators = createSpectators(context);
  context.hook(resources, 'GameMain__update', {
    onEnter() {
      const now = Date.now();
      for (const [callback, label] of frames) {
        try {
          callback(now);
        } catch (error) {
          log.error(label, error);
        }
      }
    },
  });
  context.hook(resources, 'LogicProjectileClient_ctor', {
    onEnter(args) {
      this.projectile = args[0];
      this.data = args[1];
    },
    onLeave() {
      if (context.projectileUsers) world.capture(this.projectile, this.data);
    },
  });
  context.hook(resources, 'LogicProjectileClient_destruct', {
    onEnter(args) {
      if (context.projectileUsers) world.destroy(args[0]);
    },
  });
  context.hook(resources, 'BattleScreen__update', {
    onEnter(args) {
      if (!valid(args[0])) return;
      this.screen = args[0];
      context.screen = args[0];
      context.screenAt = Date.now();
    },
    onLeave() {
      context.spectators.update(this.screen);
    },
  });
  context.hook(resources, 'LogicTile__setData', {
    onLeave() {
      world.invalidateGrid();
    },
  });
  context.hook(resources, 'LogicBattleModeClient_update', {
    onEnter(args) {
      if (!lastBattle?.equals(args[0])) {
        lastBattle = args[0];
        context.battleVersion++;
        context.lastAttackTick = null;
        log.reset();
      }
      if (!context.worldUsers) {
        if (scanning) {
          world.reset();
          context.combat.reset();
          scanning = false;
        }
        return;
      }
      scanning = true;
      const now = Date.now();
      const snapshot = world.scan(args[0], now, context.projectileUsers > 0, (error) =>
        log.error('object scan', error),
      );
      if (!snapshot) return;
      try {
        if (context.combatUsers) context.combat.update(snapshot);
      } catch (error) {
        log.error('combat scan', error);
      }
      try {
        world.refreshGrid(args[0], now);
      } catch (error) {
        log.error('tile map', error);
      }
      for (const { callback, label } of orderedTicks) {
        if (!ticks.has(callback)) continue;
        try {
          callback(snapshot);
        } catch (error) {
          log.error(label, error);
        }
      }
    },
  });
  resources.own(() => {
    context.fpsLabel?.dispose();
    world.reset();
    context.screen = null;
  });
  log.info('Agent started', { base: String(base), arch: Process.arch });
  return context;
}
