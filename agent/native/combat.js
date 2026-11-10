import { predictAim } from '../math/aim.js';
import { offsets as o } from './layout.js';
import { valid, readString } from './bindings.js';
import { canonicalName } from '../data/brawlers.js';
import { lead, skipSkills } from '../data/calibration.js';
import { sight } from '../math/walls.js';
import { distanceSquared } from '../math/geometry.js';

export class Combat {
  #context;
  #motions = new Map();
  #generation = -1;
  #cacheAt = -Infinity;
  #hyper = -1;
  #owner = null;
  #shots = [];
  #intervals = new Map();
  constructor(context) {
    this.#context = context;
  }
  reset() {
    this.#owner = null;
    this.#motions.clear();
    this.#cacheAt = -Infinity;
    this.#shots = [];
    this.#intervals.clear();
  }
  update(snapshot) {
    if (snapshot.generation !== this.#generation) {
      this.reset();
      this.#generation = snapshot.generation;
    }
    const live = new Set();
    for (const enemy of snapshot.enemies) {
      live.add(enemy.id);
      let row = this.#motions.get(enemy.id);
      if (!row) row = { x: enemy.x, y: enemy.y, time: snapshot.time, vx: 0, vy: 0, motionSpeed: 0 };
      const elapsed = snapshot.time - row.time;
      if (elapsed >= 80) {
        const dx = enemy.x - row.x,
          dy = enemy.y - row.y,
          distance = Math.hypot(dx, dy);
        row.motionSpeed =
          distance >= 40 && enemy.speed > 0
            ? Math.min((distance * 1000) / elapsed, enemy.speed * 1.35)
            : 0;
        row.vx = distance > 0 ? (dx / distance) * row.motionSpeed : 0;
        row.vy = distance > 0 ? (dy / distance) * row.motionSpeed : 0;
        row.x = enemy.x;
        row.y = enemy.y;
        row.time = snapshot.time;
      }
      this.#motions.set(enemy.id, row);
    }
    for (const id of this.#motions.keys()) if (!live.has(id)) this.#motions.delete(id);
    this.#refresh(snapshot);
  }
  #shot(data, client, kind) {
    const n = this.#context.native;
    if (!valid(data))
      return {
        client,
        data,
        kind,
        range: 0,
        speed: 4000,
        radius: 300,
        live: false,
        indirect: false,
        skip: false,
      };
    const name = readString(n.LogicData_getName(data), 64);
    const projectile = n.LogicSkillData__getProjectileData(data, 0);
    const speed = valid(projectile) ? n.LogicProjectileData_getSpeed(projectile) : 0;
    return {
      data,
      client,
      kind,
      name,
      skip: skipSkills.includes(name),
      range: n.LogicSkillData__getCastingRange(data) * 100,
      speed: speed > 0 ? speed : 4000,
      live: speed > 0,
      radius: valid(projectile) ? n.LogicProjectileData_getRadius(projectile) || 300 : 300,
      indirect: valid(projectile)
        ? projectile.add(o.Projectile_isIndirect).readU32() !== 0
        : !!this.#context.world.snapshot?.self.indirect,
    };
  }
  #refresh(snapshot) {
    const own = snapshot.self.pointer,
      n = this.#context.native;
    const hyper = own.add(o.LogicCharacterClient_hyperActive).readU8() ? 1 : 0;
    if (
      this.#owner?.equals(own) &&
      snapshot.time - this.#cacheAt < 250 &&
      hyper === this.#hyper &&
      this.#shots.length
    )
      return;
    this.#shots = [0, 1, 2].map((slot) => {
      const kind = ['attack', 'super', 'gadget'][slot];
      let client = null;
      try {
        client = n.LogicCharacterClient__getSkillAt(own, slot);
        if (slot === 2 && !valid(client)) client = n.LogicCharacterClient__getSkillAt(own, 5);
        const data =
          slot === 0 && valid(snapshot.self.weapon)
            ? snapshot.self.weapon
            : valid(client)
              ? n.LogicSkillClient__getData(client, hyper)
              : null;
        return this.#shot(data, client, kind);
      } catch (error) {
        this.#context.log.error(`combat ${kind}`, error);
        return { ...this.#shot(null, client, kind), skip: true };
      }
    });
    this.#owner = own;
    this.#cacheAt = snapshot.time;
    this.#hyper = hyper;
  }
  shotFor(client) {
    return (
      this.#shots.find(
        (shot) => valid(client) && valid(shot.client) && shot.client.equals(client),
      ) ?? this.#shots[0]
    );
  }
  attack() {
    return this.#shots[0];
  }
  aimPoint(enemy, speed) {
    const snapshot = this.#context.world.snapshot,
      shot = { ...this.attack() };
    if (speed > 0) {
      shot.speed = speed;
      shot.live = true;
    }
    const motion = this.#motions.get(enemy.id) ?? { vx: 0, vy: 0, motionSpeed: 0 };
    return predictAim(
      snapshot.self,
      { ...enemy, vx: motion.vx, vy: motion.vy, motionSpeed: motion.motionSpeed },
      shot,
      lead[canonicalName(snapshot.self.name)] ?? 65,
    );
  }
  select(shot, config) {
    const snapshot = this.#context.world.snapshot;
    if (!snapshot || !shot || shot.skip) return null;
    let enemy = null,
      bestRank = Infinity,
      bestDistance = Infinity;
    for (const candidate of snapshot.enemies) {
      const rank = candidate.kind === 'spawnable' ? 1 : 0;
      if (rank ? !config.allowSpawnables : !config.allowPlayers) continue;
      const distance = distanceSquared(snapshot.self, candidate);
      if (rank > bestRank || (rank === bestRank && distance >= bestDistance)) continue;
      if (shot.range > 0 && distance > (shot.range + candidate.radius) ** 2) continue;
      if (
        !shot.indirect &&
        !snapshot.self.indirect &&
        !sight(this.#context.world.grid, snapshot.self, candidate)
      )
        continue;
      enemy = candidate;
      bestRank = rank;
      bestDistance = distance;
    }
    if (!enemy) return null;
    const motion = this.#motions.get(enemy.id) ?? { vx: 0, vy: 0, motionSpeed: 0 };
    const point = predictAim(
      snapshot.self,
      { ...enemy, vx: motion.vx, vy: motion.vy, motionSpeed: motion.motionSpeed },
      shot,
      lead[canonicalName(snapshot.self.name)] ?? 65,
    );
    return { ...point, enemy };
  }
  interval(self) {
    const key = self.name ?? self.data.toString();
    if (!this.#intervals.has(key)) {
      const value = valid(self.weapon)
        ? this.#context.native.LogicSkillData__getMsBetweenAttacks(self.weapon)
        : 0;
      this.#intervals.set(key, value > 0 && value < 10000 ? value : 1000);
    }
    return this.#intervals.get(key);
  }
  ready(self, slot = 0) {
    const n = this.#context.native,
      skill = n.LogicCharacterClient__getSkillAt(self.pointer, slot);
    return !valid(skill) || !!n.LogicSkillClient__canActivate(skill, ptr(0), self.pointer);
  }
  fire(snapshot, point, enemy) {
    const c = this.#context;
    if (!valid(c.screen) || !this.ready(snapshot.self)) return false;
    c.screen.add(o.BattleScreen_aimX).writeS32(point.x);
    c.screen.add(o.BattleScreen_aimY).writeS32(point.y);
    c.screen.add(o.BattleScreen_aimTargetId).writeU32(enemy.id);
    c.native.BattleScreen_fireWrapperFn(c.screen, snapshot.self.pointer);
    return true;
  }
  cast(snapshot, slot, point) {
    const c = this.#context,
      n = c.native,
      client = n.LogicCharacterClient__getSkillAt(snapshot.self.pointer, slot);
    if (!valid(client)) return false;
    let data = n.LogicSkillClient__getData(
      client,
      snapshot.self.pointer.add(o.LogicCharacterClient_hyperActive).readU8() ? 1 : 0,
    );
    if (!valid(data)) return false;
    if (n.LogicSkillData__getBehaviour(data) === 3) {
      const linked = n.LogicSkillData__getLinkedSkill(data);
      if (valid(linked)) data = linked;
    }
    const kind = data.add(o.LogicSkillData_kind).readS32();
    if (kind < 2 || kind > 5) return false;
    const command = c.base
      .add(o.SkillCommandTypeTable)
      .add((kind - 2) * 4)
      .readU32();
    if (!command) return false;
    return c.input(snapshot.battle, command, (input) => {
      input.add(o.ClientInput_x).writeS32((point.x - snapshot.self.x) | 0);
      input.add(o.ClientInput_y).writeS32((point.y - snapshot.self.y) | 0);
      input.add(o.ClientInput_skillData).writePointer(data);
    });
  }
  skillSpeed(self, slot) {
    const n = this.#context.native,
      client = n.LogicCharacterClient__getSkillAt(self.pointer, slot);
    if (!valid(client)) return 0;
    let data = n.LogicSkillClient__getData(
      client,
      self.pointer.add(o.LogicCharacterClient_hyperActive).readU8() ? 1 : 0,
    );
    if (!valid(data)) return 0;
    if (n.LogicSkillData__getBehaviour(data) === 3) {
      const linked = n.LogicSkillData__getLinkedSkill(data);
      if (valid(linked)) data = linked;
    }
    const projectile = n.LogicSkillData__getProjectileData(data, 0);
    return valid(projectile) ? n.LogicProjectileData_getSpeed(projectile) : 0;
  }
}

export class TargetTracker {
  #id = null;
  reset() {
    this.#id = null;
  }
  pick(context, snapshot, rangeCheck = true) {
    const range = snapshot.self.range;
    if (range <= 0) return null;
    const reachable = (enemy, sticky) =>
      !context.native.LogicCharacterClient__isImmuneOrUntargetable(enemy.pointer) &&
      (!rangeCheck || distanceSquared(snapshot.self, enemy) < (range + (sticky ? 200 : 0)) ** 2) &&
      (snapshot.self.indirect || sight(context.world.grid, snapshot.self, enemy));
    let target = snapshot.enemies.find((enemy) => enemy.id === this.#id && reachable(enemy, true));
    if (!target) {
      let bestDistance = Infinity;
      for (const enemy of snapshot.enemies) {
        const distance = distanceSquared(snapshot.self, enemy);
        if (distance >= bestDistance || !reachable(enemy, false)) continue;
        target = enemy;
        bestDistance = distance;
      }
    }
    this.#id = target?.id ?? null;
    return target ?? null;
  }
}
