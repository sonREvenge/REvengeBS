import { compatibleOptions, bounded } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';
import { valid } from '../native/bindings.js';
import { slideMove } from '../math/pathfinding.js';

export const speedhack = {
  options: compatibleOptions({
    multiplier: bounded(3.2, 1, 10),
    intervalMs: bounded(10, 3, 200, true),
  }),
  create(context, resources, initial) {
    let config = initial,
      lastBattle = 0,
      generation = -1,
      frames = 0,
      tps = 0,
      pending = 0,
      lastSend = 0;
    const output = Memory.alloc(16),
      n = context.native;
    context.speedhackActive = true;
    resources.own(() => {
      context.speedhackActive = false;
    });
    context.subscribe(
      resources,
      (snapshot) => {
        if (generation !== snapshot.generation || snapshot.time - lastBattle > 32) {
          generation = snapshot.generation;
          pending = frames = tps = lastSend = 0;
        }
        lastBattle = snapshot.time;
      },
      { priority: 70, label: 'speedhack' },
    );
    const active = () => context.world.snapshot && Date.now() - lastBattle < 32;
    context.hook(resources, 'Speed_update', {
      onEnter() {
        frames++;
      },
      onLeave() {
        if (active())
          pending = tps >= 400 ? 0 : Math.min(8, pending + (400 - (tps || 60)) / (tps || 60));
      },
    });
    resources.interval(() => {
      tps = frames;
      frames = 0;
    }, 1000);
    function step() {
      if (!active()) return;
      const snapshot = context.world.snapshot,
        main = n.Control_getCharacter();
      if (!valid(main)) return;
      const controller = main.add(o.Control_controller).readPointer();
      if (!valid(controller)) return;
      const movement = controller.add(o.Control_movement).readPointer();
      if (!valid(movement)) return;
      let direction = context.dodgeDirection;
      if (!direction) {
        if (!movement.add(o.Control_isMoving).readU8()) return;
        const sign = context.base.add(o.Control_flipDirection).readU8() & 1 ? 1 : -1;
        const dx = (n.Control_getX1(main) - n.Control_getX2(main)) * sign,
          dy = (n.Control_getY1(main) - n.Control_getY2(main)) * sign,
          length = Math.hypot(dx, dy);
        if (length < 0.01) return;
        direction = { x: dx / length, y: dy / length };
      }
      main.add(o.Speed_reset).writeFloat(0);
      const own = n.Speed_getLocal(snapshot.battle);
      if (!valid(own)) return;
      const origin = { x: n.Speed_getX(own), y: n.Speed_getY(own) },
        speed = own.add(o.Speed_value).readInt();
      let distance = speed >= 1 ? (config.multiplier * speed) / 20 : 114;
      distance = Math.max(68, Math.min(distance, speed / 10));
      if (tps > 560) distance *= Math.pow(560 / tps, 0.5);
      const map = n.LogicBattleModeClient__getTileMap(snapshot.battle);
      if (!valid(map)) return;
      const diagonal = !!(n.Speed_diagonal(own) & 1);
      const query = (point) => {
        output.writeS32(-1);
        output.add(4).writeS32(-1);
        const code = n.Speed_pathfind(
          origin.x,
          origin.y,
          Math.round(point.x),
          Math.round(point.y),
          map,
          output,
          diagonal,
          0,
          0,
          1,
        );
        return { code, x: output.readS32(), y: output.add(4).readS32() };
      };
      const target = slideMove(
        origin,
        {
          x: Math.round(origin.x + direction.x * distance),
          y: Math.round(origin.y + direction.y * distance),
        },
        query,
      );
      const game = n.Speed_game();
      if (!valid(game)) return;
      const logic = n.Speed_getLogic(game.add(o.Speed_characterContext).readPointer());
      if (!valid(logic)) return;
      n.Speed_setPosition(logic, target.x, target.y, true);
      if (Date.now() - lastSend >= 10) {
        lastSend = Date.now();
        context.input(snapshot.battle, 2, (input) => {
          input.add(o.ClientInput_x).writeS32(target.x);
          input.add(o.ClientInput_y).writeS32(target.y);
        });
      }
    }
    let timer = null;
    function schedule() {
      if (timer !== null) clearInterval(timer);
      timer = setInterval(context.log.guard('speedhack movement', step), config.intervalMs);
    }
    resources.own(() => {
      if (timer !== null) clearInterval(timer);
    });
    schedule();
    resources.interval(
      context.log.guard('speedhack compensation', () => {
        if (!active() || pending < 1) return;
        const battle = context.world.snapshot.battle,
          own = n.Speed_getLocal(battle);
        if (!valid(own)) return;
        const sequence = battle.add(o.Speed_sequence).readInt();
        n.Speed_drain(own, (sequence / 50) | 0, (sequence % 50) * 20, battle, 0);
        pending--;
      }),
      3,
    );
    return {
      configure(next) {
        config = next;
        schedule();
      },
    };
  },
};
