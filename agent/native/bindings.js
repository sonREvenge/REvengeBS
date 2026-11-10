import { offsets } from './layout.js';

export const signatures = {
  DisplayObject__removeFromParent: ['void', ['pointer']],
  Speed_game: ['pointer', []],
  Speed_getLocal: ['pointer', ['pointer']],
  Speed_setPosition: ['pointer', ['pointer', 'int', 'int', 'bool']],
  Speed_getLogic: ['pointer', ['pointer']],
  Speed_pathfind: [
    'int',
    ['int', 'int', 'int', 'int', 'pointer', 'pointer', 'bool', 'int', 'int', 'int'],
  ],
  Speed_diagonal: ['int', ['pointer']],
  Speed_drain: ['void', ['pointer', 'int', 'int', 'pointer', 'float']],
  Speed_getX: ['uint', ['pointer']],
  Speed_getY: ['uint', ['pointer']],
  LogicBattleModeClient__getOwnPlayerIndex: ['int', ['pointer']],
  LogicProjectileData_getRendering: ['int', ['pointer']],
  LogicProjectileData__isBeam: ['bool', ['pointer']],
  LogicProjectileData__getSpawnAreaEffect: ['pointer', ['pointer']],
  AreaEffectData__getRadius: ['int', ['pointer']],
  AreaEffectData__getActiveTimeMs: ['int', ['pointer']],
  LogicData_getName: ['pointer', ['pointer']],
  LogicSkillData__getBehaviour: ['int', ['pointer']],
  LogicSkillData__getLinkedSkill: ['pointer', ['pointer']],
  TextField_setText: ['pointer', ['pointer', 'pointer']],
  Name_setupDecorated: ['pointer', ['pointer', 'pointer', 'pointer']],
  MovieClip__gotoAndStopFrameIndex: ['pointer', ['pointer', 'int']],
  ResourceManager__isResourceLoaded: ['pointer', ['pointer', 'int']],
  DropGUIContainer__ctorFromExport: ['pointer', ['pointer', 'pointer', 'pointer']],
  MovieClip__getTextFieldByName: ['pointer', ['pointer', 'pointer']],
  Stage_addChild: ['pointer', ['pointer', 'pointer']],
  Control_getCharacter: ['pointer', []],
  Control_getX1: ['float', ['pointer']],
  Control_getX2: ['float', ['pointer']],
  Control_getY1: ['float', ['pointer']],
  Control_getY2: ['float', ['pointer']],
  BattleMode_getInstance: ['pointer', []],
  LogicGameObjectClient_getX: ['int', ['pointer']],
  LogicGameObjectClient_getY: ['int', ['pointer']],
  LogicGameObjectClient_getGlobalID: ['uint', ['pointer']],
  LogicGameObjectClient_getData: ['pointer', ['pointer']],
  LogicBattleModeClient_getOwnCharacter: ['pointer', ['pointer']],
  LogicBattleModeClient_getOwnPlayerTeam: ['uint', ['pointer']],
  LogicBattleModeClient_setClientPredictionMoveTo: ['void', ['pointer', 'int', 'int', 'int']],
  LogicBattleModeClient__getTileMap: ['pointer', ['pointer']],
  LogicCharacterData_getCollisionRadius: ['uint', ['pointer']],
  LogicCharacterData_getSpeed: ['int', ['pointer']],
  LogicCharacterClient__getWeaponSkill: ['pointer', ['pointer']],
  LogicCharacterClient__getLinkedCarryable: ['pointer', ['pointer', 'pointer']],
  LogicCharacterClient__getSkillAt: ['pointer', ['pointer', 'int']],
  LogicCharacterClient__isImmuneOrUntargetable: ['bool', ['pointer']],
  LogicSkillClient__getData: ['pointer', ['pointer', 'int']],
  LogicSkillClient__canActivate: ['bool', ['pointer', 'pointer', 'pointer']],
  LogicSkillData__getCastingRange: ['int', ['pointer']],
  LogicSkillData__getMsBetweenAttacks: ['int', ['pointer']],
  LogicSkillData__getProjectileData: ['pointer', ['pointer', 'int']],
  LogicProjectileData_getSpeed: ['uint', ['pointer']],
  LogicProjectileData_getRadius: ['uint', ['pointer']],
  LogicProjectileClient_getTargetX: ['int', ['pointer']],
  LogicProjectileClient_getData: ['pointer', ['pointer']],
  LogicProjectileClient_getTargetY: ['int', ['pointer']],
  BattleScreen_fireWrapperFn: ['int', ['pointer', 'pointer']],
  ClientInput_constructor_int: ['pointer', ['pointer', 'int']],
  ClientInputManager_addInput: ['void', ['pointer', 'pointer']],
  CombatHUD__sendPinCommand: ['void', ['int']],
  CombatHUD__sendSprayCommand: ['void', ['int']],
  operator_new: ['pointer', ['ulong']],
  StringCtor: ['pointer', ['pointer', 'pointer']],
  ScString_destruct: ['pointer', ['pointer']],
  TeamChatMessage__ctor: ['void', ['pointer']],
  MessageManager__sendMessage: ['void', ['pointer', 'pointer']],
  ResourceManager__getCSV: ['pointer', ['pointer']],
  CSVRow__getName: ['pointer', ['pointer']],
};

export function createBindings(base) {
  const cache = new Map();
  return new Proxy(
    {},
    {
      get(_, name) {
        if (!Object.hasOwn(signatures, name))
          throw new Error(`Unknown native function: ${String(name)}`);
        if (!cache.has(name)) {
          const [result, args] = signatures[name];
          cache.set(name, new NativeFunction(base.add(offsets[name]), result, args));
        }
        return cache.get(name);
      },
    },
  );
}

export const valid = (pointer) => pointer != null && !pointer.isNull();

export function* pointerArray(array, count) {
  let bytes = null;
  try {
    bytes = new DataView(array.readByteArray(count * 8));
  } catch {
    /* Read entries separately if the full span is unavailable */
  }
  for (let index = 0; index < count; index++) {
    try {
      if (!bytes) {
        yield array.add(index * 8).readPointer();
        continue;
      }
      const low = bytes.getUint32(index * 8, true),
        high = bytes.getUint32(index * 8 + 4, true);
      if (low || high)
        yield ptr('0x' + high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0'));
    } catch {
      /* A removed entry should not hide the remaining objects */
    }
  }
}

export function readString(value, max = 256) {
  if (!valid(value)) return null;
  const length = value.add(offsets.ScString_length).readS32();
  if (length < 0 || length > max) return null;
  if (length === 0) return '';
  const storage = value.add(offsets.ScString_data);
  const data = length <= 7 ? storage : storage.readPointer();
  return valid(data) ? data.readUtf8String(length) : null;
}

export function withString(native, text, callback) {
  const string = Memory.alloc(32);
  native.StringCtor(string, Memory.allocUtf8String(text));
  try {
    return callback(string);
  } finally {
    native.ScString_destruct(string);
  }
}
