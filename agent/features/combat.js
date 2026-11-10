import { compatibleOptions, boolean, bounded, names } from '../runtime/options.js';
import { canonicalName } from '../data/brawlers.js';
import { valid } from '../native/bindings.js';
import { offsets as o } from '../native/layout.js';
import { TargetTracker } from '../native/combat.js';

export const aimbot = {
  options: compatibleOptions({
    onManualAim: boolean(true),
    onAutoshoot: boolean(true),
    useSuper: boolean(true),
    allowGadget: boolean(true),
    allowPlayers: boolean(true),
    allowSpawnables: boolean(true),
    superBrawlers: names(),
  }),
  create(context, resources, initial) {
    let config = initial;
    context.useWorld(resources, { combat: true });
    context.hook(resources, 'BattleScreen_activateSkill', {
      onEnter(args) {
        if (!context.fresh() || context.world.snapshot.self.carrying) return;
        const shot = context.combat.shotFor(args[4]);
        if (!shot || shot.skip) return;
        if (
          shot.kind === 'super' &&
          (!config.useSuper ||
            (config.superBrawlers.length &&
              !config.superBrawlers.includes(canonicalName(context.world.snapshot.self.name))))
        )
          return;
        if (shot.kind === 'gadget' && !config.allowGadget) return;
        const manual = args[6].toInt32() === 0;
        if (shot.kind === 'attack' && (manual ? !config.onManualAim : !config.onAutoshoot)) return;
        if (shot.kind === 'super' && !config.onManualAim && !config.onAutoshoot) return;
        const target = context.combat.select(shot, config);
        if (target) {
          args[1] = ptr(target.x);
          args[2] = ptr(target.y);
        }
      },
    });
    context.hook(resources, 'BattleScreen_getClosestTargetForAutoshoot', {
      onLeave(result) {
        if (!config.onAutoshoot || !context.fresh() || context.world.snapshot.self.carrying) return;
        const target = context.combat.select(context.combat.attack(), config);
        if (target) result.replace(target.enemy.pointer);
      },
    });
    return {
      configure(next) {
        config = next;
      },
    };
  },
};

function shooting(heldOnly) {
  return {
    options: compatibleOptions(
      heldOnly
        ? {
            aim: boolean(true),
            rangeCheck: boolean(true),
            useUlti: boolean(false),
            lead: boolean(true),
            intervalMs: bounded(80, 80, 10000, true),
          }
        : {
            useAttack: boolean(true),
            useSuper: boolean(false),
            useHyper: boolean(false),
            superBrawlers: names(),
            lead: boolean(true),
            intervalMs: bounded(1, 1, 10000, true),
          },
    ),
    create(context, resources, initial) {
      let config = initial,
        attackAt = 0,
        superAt = 0,
        hyperAt = 0,
        previousUlti = false,
        generation = -1,
        errorUntil = 0;
      const targets = new TargetTracker();
      context.subscribe(
        resources,
        (snapshot) => {
          if (generation !== snapshot.generation) {
            generation = snapshot.generation;
            attackAt = superAt = hyperAt = errorUntil = 0;
            previousUlti = false;
            targets.reset();
          }
          if (
            snapshot.time < errorUntil ||
            snapshot.self.carrying ||
            !valid(context.screen) ||
            snapshot.time - context.screenAt > 200
          )
            return;
          const ulti = heldOnly && !!context.screen.add(o.BattleScreen_ultiJoyHeld).readU8();
          const rising = ulti && !previousUlti;
          previousUlti = ulti;
          const held =
            heldOnly &&
            !ulti &&
            !!(
              context.screen.add(o.BattleScreen_autoFireBtnHeld).readU8() |
              context.screen.add(o.BattleScreen_attackJoyHeld).readU8()
            );
          if (heldOnly && !held && !rising) return;
          if (!heldOnly && !config.useAttack && !config.useSuper && !config.useHyper) return;
          const target = targets.pick(context, snapshot, heldOnly ? config.rangeCheck : true);
          if (!target) return;
          const aim = (speed = 0) =>
            config.lead && (!heldOnly || config.aim)
              ? context.combat.aimPoint(target, speed)
              : { x: target.x, y: target.y };
          try {
            if (
              (heldOnly ? held : config.useAttack) &&
              snapshot.time - attackAt >=
                Math.max(
                  heldOnly ? 80 : 1,
                  context.combat.interval(snapshot.self),
                  config.intervalMs,
                ) &&
              context.lastAttackTick !== snapshot.time
            ) {
              if (context.combat.fire(snapshot, aim(), target)) {
                attackAt = snapshot.time;
                context.lastAttackTick = snapshot.time;
              }
            }
            const superAllowed = heldOnly
              ? rising && config.useUlti
              : config.useSuper &&
                (!config.superBrawlers.length ||
                  config.superBrawlers.includes(canonicalName(snapshot.self.name)));
            if (superAllowed && snapshot.time - superAt >= 1500) {
              superAt = snapshot.time;
              context.combat.cast(snapshot, 1, aim(context.combat.skillSpeed(snapshot.self, 1)));
            }
            if (!heldOnly && config.useHyper && snapshot.time - hyperAt >= 1500) {
              hyperAt = snapshot.time;
              context.input(snapshot.battle, 0x11);
            }
          } catch (error) {
            errorUntil = snapshot.time + 2000;
            context.log.error(heldOnly ? 'holdshoot' : 'killaura', error);
          }
        },
        { priority: heldOnly ? 60 : 20, combat: true, label: heldOnly ? 'holdshoot' : 'killaura' },
      );
      return {
        configure(next) {
          config = next;
        },
      };
    },
  };
}
export const holdshoot = shooting(true);
export const killaura = shooting(false);
