import { offsets as o } from './layout.js';
import { valid, readString, pointerArray } from './bindings.js';
import { canonicalName } from '../data/brawlers.js';

export class World {
  #native;
  #base;
  #battle = null;
  #shots = new Map();
  #destroyed = [];
  #characters = new Map();
  #ranges = new Map();
  #harvested = new Set();
  #names = new Map();
  #friendly = new Set();
  #dirty = true;
  #gridAttempt = -Infinity;
  generation = 0;
  snapshot = null;
  grid = null;

  constructor(base, native) {
    this.#base = base;
    this.#native = native;
  }
  invalidateGrid() {
    this.#dirty = true;
    this.#gridAttempt = -Infinity;
  }
  reset() {
    this.generation++;
    this.#shots.clear();
    this.#destroyed = [];
    this.#characters.clear();
    this.#ranges.clear();
    this.#harvested.clear();
    this.#names.clear();
    this.#friendly.clear();
    this.snapshot = null;
    this.grid = null;
    this.#dirty = true;
    this.#gridAttempt = -Infinity;
  }
  #attempt(callback, fallback = null) {
    try {
      return callback();
    } catch {
      return fallback;
    }
  }
  #position(pointer) {
    return {
      x: this.#native.LogicGameObjectClient_getX(pointer),
      y: this.#native.LogicGameObjectClient_getY(pointer),
    };
  }
  #name(data) {
    return this.#attempt(() => {
      const name = data.add(o.HeroData_namePtr).readPointer().readCString();
      return name?.startsWith('hero_icon_') ? canonicalName(name.slice(10)) : null;
    });
  }
  #dataName(data) {
    return (
      this.#attempt(() => readString(this.#native.LogicData_getName(data), 128)) ||
      this.#attempt(() => readString(data.add(o.LogicProjectileClient_dataName).readPointer(), 128))
    );
  }
  #harvest(pointer, force = false) {
    const key = pointer.toString();
    if (!force && this.#harvested.has(key)) return;
    const n = this.#native;
    let found = false;
    const collect = (skill) => {
      if (!valid(skill)) return;
      found = true;
      const range = n.LogicSkillData__getCastingRange(skill) * 100;
      if (range <= 0) return;
      for (let index = 0; index < 4; index++) {
        const projectile = n.LogicSkillData__getProjectileData(skill, index);
        if (!valid(projectile)) continue;
        const name = this.#dataName(projectile);
        if (name) {
          this.#ranges.set(name, Math.max(range, this.#ranges.get(name) ?? 0));
          found = true;
        }
      }
    };
    this.#attempt(() => collect(n.LogicCharacterClient__getWeaponSkill(pointer)));
    for (let slot = 0; slot < 8; slot++)
      this.#attempt(() => {
        const skill = n.LogicCharacterClient__getSkillAt(pointer, slot);
        if (valid(skill))
          for (let hyper = 0; hyper < 2; hyper++)
            this.#attempt(() => collect(n.LogicSkillClient__getData(skill, hyper)));
      });
    if (found) this.#harvested.add(key);
  }
  #character(pointer, data, own = false) {
    const n = this.#native,
      id = n.LogicGameObjectClient_getGlobalID(pointer);
    if (!own && pointer.add(o.GameObj_deadFlag).readU32()) return null;
    let cached = this.#names.get(id);
    if (!cached || !cached.data.equals(data)) {
      cached = { data, name: this.#name(data) };
      this.#names.set(id, cached);
    }
    const name = cached.name;
    const radius = this.#attempt(() => n.LogicCharacterData_getCollisionRadius(data), 0);
    if (!own && !name && radius <= 0) return null;
    const body = this.#attempt(() => {
      const linked = pointer.add(o.LogicCharacterClient_body).readPointer();
      return valid(linked) &&
        !linked.equals(pointer) &&
        linked.readPointer().equals(pointer.readPointer())
        ? linked
        : pointer;
    }, pointer);
    const weapon = this.#attempt(() => n.LogicCharacterClient__getWeaponSkill(pointer));
    const playerIndex = this.#attempt(
      () => pointer.add(o.LogicGameObjectClient_ownerIndex).readS32(),
      -1,
    );
    const character = {
      ...this.#position(body),
      id,
      pointer,
      data,
      name,
      radius: radius || (own ? 60 : 0),
      speed: this.#attempt(() => n.LogicCharacterData_getSpeed(data), own ? 720 : 0),
      team: pointer.add(o.GameObj_team).readU32(),
      playerIndex,
      weapon,
      range: valid(weapon)
        ? this.#attempt(() => n.LogicSkillData__getCastingRange(weapon) * 100, 0)
        : 0,
      kind: name ? 'player' : 'spawnable',
    };
    if (name || own) {
      if (playerIndex >= 0) this.#characters.set(playerIndex, character);
      this.#harvest(pointer);
    }
    return character;
  }
  capture(pointer, data, now = Date.now()) {
    if (!valid(pointer)) return;
    const n = this.#native,
      id = n.LogicGameObjectClient_getGlobalID(pointer);
    const existing = this.#shots.get(id);
    if (existing) {
      existing.pointer = pointer;
      existing.seenAt = now;
      return;
    }
    if (!valid(data)) data = this.#attempt(() => n.LogicProjectileClient_getData(pointer));
    if (!valid(data)) data = n.LogicGameObjectClient_getData(pointer);
    if (!valid(data)) return;
    const position = this.#position(pointer),
      speed = Math.max(1, n.LogicProjectileData_getSpeed(data));
    const radius = Math.max(0, n.LogicProjectileData_getRadius(data));
    const rendering = this.#attempt(() => n.LogicProjectileData_getRendering(data), 0);
    const angle =
      rendering === 3 ? this.#attempt(() => pointer.add(o.Projectile_angle).readU32() % 360) : null;
    const area = this.#attempt(() => n.LogicProjectileData__getSpawnAreaEffect(data));
    const hitRadius =
      radius > 0
        ? radius * 1.05
        : speed <= 800
          ? 520
          : speed >= 1400 && speed <= 1600
            ? 320
            : speed > 3500
              ? 350
              : 240;
    this.#shots.set(id, {
      id,
      pointer,
      data,
      ...position,
      spawnX: position.x,
      spawnY: position.y,
      name: this.#dataName(data),
      speed,
      radius,
      hitRadius,
      rendering,
      angle,
      targetX: this.#attempt(() => n.LogicProjectileClient_getTargetX(pointer), 0),
      targetY: this.#attempt(() => n.LogicProjectileClient_getTargetY(pointer), 0),
      indirect: data.add(o.Projectile_isIndirect).readU32() !== 0,
      isBeam: this.#attempt(() => n.LogicProjectileData__isBeam(data), false),
      ownerTeam: pointer.add(o.LogicProjectileClient_ownerTeam).readU32(),
      ownerIndex: this.#attempt(
        () => pointer.add(o.LogicGameObjectClient_ownerIndex).readS32(),
        -1,
      ),
      spawnAreaRadius: valid(area) ? this.#attempt(() => n.AreaEffectData__getRadius(area), 0) : 0,
      spawnAreaActiveTime: valid(area)
        ? this.#attempt(() => n.AreaEffectData__getActiveTimeMs(area), 0)
        : 0,
      spawnedAt: now,
      seenAt: now,
      time: now,
      sampled: false,
      vx: angle === null ? 0 : Math.cos((angle * Math.PI) / 180) * speed,
      vy: angle === null ? 0 : Math.sin((angle * Math.PI) / 180) * speed,
    });
  }
  destroy(pointer) {
    const id = this.#native.LogicGameObjectClient_getGlobalID(pointer),
      shot = this.#shots.get(id);
    if (shot && this.#destroyed.length < 16) this.#destroyed.push({ ...shot });
    this.#shots.delete(id);
  }
  #updateShots(now, self, friendly) {
    const result = [];
    for (const [id, shot] of this.#shots) {
      if (now - shot.seenAt > 800) {
        this.#shots.delete(id);
        continue;
      }
      const updated = this.#attempt(() => {
        const position = this.#position(shot.pointer),
          dt = (now - shot.time) / 1000;
        const dx = position.x - shot.x,
          dy = position.y - shot.y;
        if (dt > 0.002 && dt < 0.3 && dx * dx + dy * dy >= 16) {
          const alpha = shot.sampled ? 0.4 : 1;
          shot.vx = shot.vx * (1 - alpha) + (dx / dt) * alpha;
          shot.vy = shot.vy * (1 - alpha) + (dy / dt) * alpha;
          shot.sampled = true;
        }
        if (!shot.targetX && !shot.targetY) {
          shot.targetX = this.#native.LogicProjectileClient_getTargetX(shot.pointer);
          shot.targetY = this.#native.LogicProjectileClient_getTargetY(shot.pointer);
        }
        if (!shot.sampled && !shot.vx && !shot.vy) {
          const dx = shot.targetX - position.x,
            dy = shot.targetY - position.y,
            length = Math.hypot(dx, dy);
          if (length > 0) {
            shot.vx = (dx / length) * shot.speed;
            shot.vy = (dy / length) * shot.speed;
          }
        }
        Object.assign(shot, position, { time: now });
        const owner =
          shot.ownerIndex < 0
            ? null
            : shot.ownerIndex === self.playerIndex
              ? self
              : this.#characters.get(shot.ownerIndex);
        shot.ownerName = owner?.name;
        shot.ownerX = owner?.x;
        shot.ownerY = owner?.y;
        if (shot.name && !this.#ranges.has(shot.name) && owner?.pointer)
          this.#harvest(owner.pointer, true);
        shot.castRange = this.#ranges.get(shot.name) ?? 0;
        return true;
      }, false);
      if (!updated) {
        this.#shots.delete(id);
        continue;
      }
      if (shot.ownerTeam !== self.team && !friendly.has(shot.ownerIndex)) result.push({ ...shot });
    }
    return result;
  }
  scan(battle, now, projectiles = false, onError = () => {}) {
    if (!valid(battle)) {
      this.reset();
      this.#battle = null;
      return null;
    }
    if (!this.#battle?.equals(battle)) {
      this.reset();
      this.#battle = battle;
    }
    this.snapshot = null;
    const n = this.#native,
      own = n.LogicBattleModeClient_getOwnCharacter(battle);
    if (!valid(own)) return null;
    const ownData = n.LogicGameObjectClient_getData(own);
    if (!valid(ownData)) return null;
    const self = this.#character(own, ownData, true);
    self.team = n.LogicBattleModeClient_getOwnPlayerTeam(battle);
    self.playerIndex = this.#attempt(
      () => n.LogicBattleModeClient__getOwnPlayerIndex(battle),
      self.playerIndex,
    );
    const speed =
      self.speed + this.#attempt(() => own.add(o.LogicCharacterClientOwn_speedBuff).readS32(), 0);
    self.speed = speed >= 300 && speed <= 3000 ? speed : 720;
    self.carrying = this.#attempt(
      () => valid(n.LogicCharacterClient__getLinkedCarryable(own, battle)),
      false,
    );
    const projectile = valid(self.weapon)
      ? this.#attempt(() => n.LogicSkillData__getProjectileData(self.weapon, 0))
      : null;
    self.indirect = valid(projectile) && projectile.add(o.Projectile_isIndirect).readU32() !== 0;
    const enemies = [],
      friendly = this.#friendly;
    if (self.playerIndex >= 0) friendly.add(self.playerIndex);
    const manager = battle.add(o.BattleMode_objectManagerPtr).readPointer();
    if (valid(manager)) {
      const count = manager.add(o.ObjectManager_count).readU32(),
        objects = manager.add(o.ObjectManager_objectsArray).readPointer();
      if (count > 1200) throw new Error('Invalid object count');
      if (valid(objects))
        for (const pointer of pointerArray(objects, count)) {
          try {
            if (!valid(pointer) || pointer.equals(own)) continue;
            const data = n.LogicGameObjectClient_getData(pointer);
            if (!valid(data)) continue;
            const team = pointer.add(o.GameObj_team).readU32();
            if (data.readPointer().equals(this.#base.add(o.VTABLE_PROJECTILE_DATA))) {
              if (projectiles && team !== self.team) this.capture(pointer, data, now);
            } else if (team === self.team) {
              const index = pointer.add(o.LogicGameObjectClient_ownerIndex).readS32();
              if (index >= 0) friendly.add(index);
            } else {
              const enemy = this.#character(pointer, data);
              if (enemy) enemies.push(enemy);
            }
          } catch (error) {
            onError(error);
          }
        }
    }
    const shots = projectiles ? this.#updateShots(now, self, friendly) : [];
    if (!projectiles) this.#shots.clear();
    const active = new Set([self.id, ...enemies.map((enemy) => enemy.id)]);
    for (const id of this.#names.keys()) if (!active.has(id)) this.#names.delete(id);
    const indices = new Set([
      self.playerIndex,
      ...enemies.map((enemy) => enemy.playerIndex),
      ...shots.map((shot) => shot.ownerIndex),
    ]);
    for (const index of this.#characters.keys())
      if (!indices.has(index)) this.#characters.delete(index);
    this.snapshot = {
      battle,
      self,
      enemies,
      projectiles: shots,
      destroyed: this.#destroyed.splice(0),
      time: now,
      generation: this.generation,
    };
    return this.snapshot;
  }
  refreshGrid(battle, now) {
    if (!this.#dirty || now - this.#gridAttempt < 2000) return;
    this.#gridAttempt = now;
    const map = this.#native.LogicBattleModeClient__getTileMap(battle);
    if (!valid(map)) return;
    const width = map.add(o.TileMap_Width).readS32(),
      height = map.add(o.TileMap_Height).readS32();
    if (width < 1 || height < 1 || width > 120 || height > 120)
      throw new Error('Invalid tile map dimensions');
    const array = map.add(o.TileMap_TilesArray).readPointer();
    if (!valid(array)) return;
    const cells = new Uint8Array(width * height),
      types = new Map();
    for (let i = 0; i < cells.length; i++) {
      const tile = array.add(i * 8).readPointer();
      if (!valid(tile)) continue;
      const type = tile.readPointer();
      if (!valid(type)) continue;
      const key = type.toString();
      if (!types.has(key))
        types.set(
          key,
          (type.add(o.TileTypeData_BlocksMovement).readU8() ? 1 : 0) |
            (type.add(o.TileTypeData_BlocksProjectiles).readU8() ? 2 : 0),
        );
      cells[i] = types.get(key);
    }
    this.grid = { width, height, cells };
    this.#dirty = false;
  }
}
