'use strict';

const state = { aimbot: false, autododge: false, killaura: false };
const sharedState = { ownCarryingBall: false };

let _utilsLibc = null;
function initUtils(libc) { _utilsLibc = libc; }
function getLibc() {
  if (!_utilsLibc) throw new Error('libc not initialized');
  return _utilsLibc;
}

const OFFSETS_ARM64 = {

    LogicBattleModeClient_update:                    0xB8EEE0,
    BattleMode_getInstance:                          0x954EE0,
    LogicGameObjectClient_getX:                      0xAE4A1C,
    LogicGameObjectClient_getY:                      0xAE4A24,
    LogicBattleModeClient_getOwnCharacter:           0xB90A28,
    BattleScreen_getClosestTargetForAutoshoot:       0x8151E0,
    BattleScreen_activateSkill:                      0x80274C,
    Gui_getInstance:                                 0x591644,
    StringCtor:                                      0xDCF8F0,
    Gui_showFloaterTextAtDefaultPos:                 0x818CDC,
    LogicBattleModeClient_getOwnPlayerTeam:          0xB90680,
    LogicGameObjectClient_getGlobalID:               0xAE49C8,
    LogicGameObjectClient_getData:                   0xAE46FC,
    LogicProjectileData_getRadius:                   0xA8164C,
    LogicProjectileData_getSpeed:                    0xA815CC,
    LogicCharacterData_getCollisionRadius:           0xA3B52C,
    decoratedTextFieldSetPlayerName:                 0x598298,
    handleJoystick:                                  0x588180,
    ClientInputMessage_sendMovement:                 0x7C13DC,
    ClientInput_constructor_int:                     0xB53A68,
    ClientInputManager_addInput:                     0x79BF3C,
    LogicBattleModeClient_setClientPredictionMoveTo: 0xB90B8C,
    LogicTileMap_getTile:                            0x9DC190,
    Sprite_Sprite:                                   0xC2D684,

    VTABLE_PROJECTILE_DATA:                          0x11501B0,
    VTABLE_CHARACTER_DATA:                           0x44BF6F8,

    TileMap_Width:                                   0xC4,
    TileMap_Height:                                  0xC8,
    TileMap_TilesArray:                              0x20,
    TileTypeData_BlocksMovement:                     0x56,
    TileTypeData_BlocksProjectiles:                  0x57,

    BattleMode_objectManagerPtr:                     0x28,
    BattleMode_clientInputManager:                  0x58,

    ObjectManager_objectsArray:                      0x00,
    ObjectManager_count:                             0x0C,
    ObjectManager_ptrStride:                         8,

    GameObj_team:                                    0x40,
    GameObj_deadFlag:                                0xD0,

    CharData_speed:                                  0x1C4,
    CharData_brawlerId:                              0x18,

    Projectile_spawnAngle:                           0xB8,

    Joy_currentX:                                    0x94,
    Joy_currentY:                                    0x98,
    Joy_centerX:                                     0x9C,
    Joy_centerY:                                     0xA0,
    Joy_isDragging:                                  0x10,

    ScString_length:                                 0x04,
    ScString_data:                                   0x08,

    Stage_addChild: 0xC336A0,
    ResourceListener_addFile: 0xC9A180,
    TextField_setText: 0xC4A978,
    MovieClip_setChildVisible: 0xC1DD48,
    MovieClip_getTextFieldByName: 0xC1D7B0,
    BattleMode_enter: 0x956664,
    ButtonCallback: 0xC4DFCC,
    Sprite_addChild: 0xC2D8C4,
    TextField_setText_ui: 0x598298,
    DisplayObject_setXY: 0xC16B4C,
    MovieClip_gotoAndStopFrameIndex: 0xC1C90C,
    CustomButton_SetMovieClip: 0xC4E18C,
    GameMain__draw: 0x4B63A0,
    DecalManager__DecalManager: 0x50DAEC,
    LogicProjectileData__IsOwnTeamProjectile: 0x50E1D4,
    GameObjectManager__GameObjectManager: 0x50F1C0,
    getProjectiles: 0x514F88,
    Projectile__update: 0x5158F8,
    RenderSystem__RenderSystem: 0x518168,
    CombatHUD__toggleEditing: 0x56ECDC,
    BattleScreen__update: 0x56FA80,
    Character__updateHealthBar: 0x57647C,
    CombatHUD__update: 0x579FCC,
    CombatHUD__setShootStickState: 0x58575C,
    CombatHUD__setMoveStickState: 0x58580C,
    GUI__getDefaultFloaterPos: 0x591DA0,
    GUI__showFloaterTextAt: 0x591F28,
    GUI__showPopup: 0x592C24,
    GameButtonCtor: 0x597C48,
    GameSliderComponent__GameSliderComponent: 0x59C004,
    GameSliderComponent__setValueBounds: 0x59C808,
    MapEditorModifierItem__MapEditorModifierItem: 0x6E6148,
    MapEditorModifierPopup__MapEditorModifierPopup: 0x6E7060,
    MapEditorModifierPopup__addModifierItem: 0x6E79FC,
    PopupBase__PopupBase: 0x6F6E18,
    MessageManager__receiveMessage: 0x7BAD14,
    BattleScreen__BattleScreen: 0x7FB2E8,
    BattleScreen__initializeMembers: 0x7FB59C,
    BattleScreen__stopWithStick: 0x8015DC,
    BattleScreen__handleTouchReleased: 0x80184C,
    BattleScreen__updateAutoshoot: 0x8076A0,
    BattleScreen__updateMovement: 0x809348,
    BattleScreen__tryToActivateSkill: 0x80D758,
    BattleScreen__shouldShowAccessoryButton: 0x80EB4C,
    BattleScreen__calculateProjectilePath: 0x811C5C,
    BattleScreen__joystickToWorld: 0x815E84,
    GameScreen__getLogicBattle: 0x818BCC,
    MapEditorScreen__updateCameraParameters: 0x82C1C4,
    MapEditorScreen__initRenderSystem: 0x82C3CC,
    MapEditorScreen__initItems: 0x82C530,
    MapEditorScreen__initCharacters: 0x82C5FC,
    GameSettings__isFixedJoystickEnabled: 0x944088,
    BattleMode__enter: 0x956664,
    BattleMode__addResourcesToLoad: 0x9568B8,
    GameStateManager__getInstance: 0x95DAE4,
    GameStateManager__isState: 0x95E7C0,
    HomeMode__getInstance: 0x95F488,
    StringTable__getMovieClip: 0x96DC24,
    MovieClipHelper__setTextAndScaleIfNecessary: 0x990CA8,
    LogicTile__setData: 0x9DA7E0,
    LogicTileMap__LogicTileMap: 0x9DB0A4,
    LogicTileMap__isPlayerLineOfSightClear: 0x9DF84C,
    LogicTileMap__isPlayerLineOfSightClear1: 0x9DF87C,
    LogicCarryableData__getThrowOverWalls: 0xA33E00,
    LogicCharacterData__isCarryable: 0xA3BEEC,
    LogicDataTables__getOpenTileData: 0xA5CEAC,
    LogicDataTables__getBaseTileData: 0xA5CF00,
    LogicDataTables__getSiegeBoltTileData: 0xA5CF54,
    LogicProjectileData__isBeam: 0xA81770,
    LogicProjectileData__getNumEarlyTicks: 0xA81A44,
    LogicSkillData__getActiveTime: 0xA940DC,
    LogicSkillData__getRechargeTime: 0xA943C0,
    LogicSkillData__getMaxCharge: 0xA943D0,
    LogicSkillData__getMsBetweenAttacks: 0xA943F8,
    LogicTileData__blocksMovement: 0xAA64CC,
    LogicCharacterClient__getCarryableData: 0xAB35D4,
    LogicCharacterClient__getWeaponSkill: 0xAB4418,
    LogicCharacterClient__canMoveAndUseThisSkillSimultaneously: 0xAB4430,
    LogicCharacterClient__getLinkedCarryable: 0xAB4728,
    LogicCharacterClient__getCurrentActiveOrCastingSkill: 0xAB5028,
    LogicCharacterClientOwn__clientPredictionPauseMovementForSkillCasting: 0xAB70D4,
    LogicCharacterClientOwn__clientPredictionUpdateAttackDirection: 0xAB713C,
    LogicGameObjectManagerClient__LogicGameObjectManagerClient: 0xAE4D30,
    LogicGameObjectManagerClient__getGameObjects: 0xAE514C,
    LogicGameObjectManagerClient__findGameObject: 0xAE802C,
    LogicGameObjectServer__getData: 0xAEED9C,
    LogicProjectileServer__shootProjectile: 0xAFB7DC,
    LogicProjectileServer__runEarlyTicks: 0xAFC678,
    getProjData: 0xB1D358,
    GlobalID__getInstanceID: 0xB21988,
    LogicPlayerMap__save: 0xB2A2C4,
    LogicPlayerMapUtil__tileDataToTileCode: 0xB2E0F0,
    AnalyticEvent__AnalyticEvent: 0xB47738,
    AnalyticEvent__setString: 0xB47828,
    LogicBattleModeClient__LogicBattleModeClient: 0xB8E67C,
    LogicBattleModeClient__setRandomSeed: 0xB8E878,
    LogicBattleModeClient__setPlayerAvatar: 0xB8EDF0,
    LogicBattleModeClient__getOwnPlayerIndex: 0xB90678,
    LogicBattleModeClient__getTileMap: 0xB909A8,
    SetClientPrediction: 0xB90B8C,
    LogicGameModeUtil__isTileOnPoisonArea: 0xBD4008,
    LogicGamePlayUtil__getClosestAnyCollision: 0xBD55E8,
    ScrollArea__scrollTo: 0xBE15E8,
    StringTable_getMovieClip: 0xBECE60,
    DisplayObject__setXY: 0xC16B4C,
    DisplayObject__removeFromParent: 0xC16EA8,
    MovieClip__gotoAndStopFrameIndex: 0xC1C90C,
    MovieClip__getTextFieldByName: 0xC1D550,
    MovieClip__setChildVisible: 0xC1DD48,
    Sprite__addChild: 0xC2D8C4,
    Sprite__addChildAt: 0xC2D8CC,
    Sprite__removeChild: 0xC2DB9C,
    ScrollArea__updateBounds: 0xC4FA78,
    ScrollArea__addContent: 0xC4FC78,
    ScrollArea__removeAllContent: 0xC4FCC8,
    CSVRow__getIntegerValueAt: 0xC5D67C,
    LogicJSONObject__put: 0xC639A0,
    LogicRandom__setIteratedRandomSeed: 0xC67710,
    LogicCompressedString__LogicCompressedString: 0xC7B218,
    LogicLongToCodeConverterUtil__LogicLongToCodeConverterUtil: 0xC7B4E4,
    LogicLongToCodeConverterUtil__convert: 0xC7B550,
    LogicLongToCodeConverterUtil__toCode: 0xC7B828,
    ResourceListener__addFile: 0xC9A180,
    String__format: 0xDD244C,
    FramerateManager__setSegment: 0xDDBDE0,
    Application__copyString: 0xE4A7B4
};

function resolveOffsets() {
    const o = Object.assign({}, OFFSETS_ARM64);
    o.Killaura_nativeFire = 0x802960;
    return o;
}

const offsets = resolveOffsets();

let _base = null;
let _libc = null;

function libg(intervalMs = 50) {
    if (_base) return Promise.resolve(_base);

    let mod = Process.findModuleByName("libg.so");
    if (mod) {
        _base = mod.base;
        return Promise.resolve(_base);
    }

    return new Promise((resolve) => {
        const id = setInterval(() => {
            mod = Process.findModuleByName("libg.so");
            if (mod) {
                clearInterval(id);
                _base = mod.base;
                resolve(_base);
            }
        }, intervalMs);
    });
}

function libc(intervalMs = 50) {
    if (_libc) return Promise.resolve(_libc);

    let mod = Process.findModuleByName("libc.so");
    if (mod) {
        _libc = _initLibc(mod);
        return Promise.resolve(_libc);
    }

    return new Promise((resolve) => {
        const id = setInterval(() => {
            mod = Process.findModuleByName("libc.so");
            if (mod) {
                clearInterval(id);
                _libc = _initLibc(mod);
                resolve(_libc);
            }
        }, intervalMs);
    });
}

function _initLibc(mod) {
    const obj = {
        malloc: new NativeFunction(mod.getExportByName("malloc"), "pointer", ["uint"]),
        memset:   new NativeFunction(mod.getExportByName("memset"),   "pointer",    ["pointer", "int", "uint"])
    };
    return obj;
}

let _n = null;

function initFunctions(base) {
    if (_n) return _n;

    _n = {
        BattleMode_getInstance:
                new NativeFunction(base.add(offsets.BattleMode_getInstance), 'pointer', []),
            LogicGameObjectClient_getX:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getX), 'int32', ['pointer']),
            LogicGameObjectClient_getY:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getY), 'int32', ['pointer']),
            LogicBattleModeClient_getOwnCharacter:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_getOwnCharacter), 'pointer', ['pointer']),
            LogicBattleModeClient_setClientPredictionMoveTo:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_setClientPredictionMoveTo), 'void', ['pointer','int','int','int']),
            Gui_getInstance:
                new NativeFunction(base.add(offsets.Gui_getInstance), 'pointer', []),
            ClientInput_constructor_int:
                new NativeFunction(base.add(offsets.ClientInput_constructor_int), 'pointer', ['pointer','int']),
            ClientInputManager_addInput:
                new NativeFunction(base.add(offsets.ClientInputManager_addInput), 'void', ['pointer','pointer']),
            StringCtor:
                new NativeFunction(base.add(offsets.StringCtor), 'pointer', ['pointer','pointer']),
            Gui_showFloaterTextAtDefaultPos:
                new NativeFunction(base.add(offsets.Gui_showFloaterTextAtDefaultPos), 'void', ['pointer','pointer','int','int']),
            LogicGameObjectClient_getGlobalID:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getGlobalID), 'uint32', ['pointer']),
            LogicBattleModeClient_getOwnPlayerTeam:
                new NativeFunction(base.add(offsets.LogicBattleModeClient_getOwnPlayerTeam), 'uint32', ['pointer']),
            LogicGameObjectClient_getData:
                new NativeFunction(base.add(offsets.LogicGameObjectClient_getData), 'pointer', ['pointer']),
            LogicProjectileData_getSpeed:
                new NativeFunction(base.add(offsets.LogicProjectileData_getSpeed), 'uint32', ['pointer']),
            LogicProjectileData_getRadius:
                new NativeFunction(base.add(offsets.LogicProjectileData_getRadius), 'uint32', ['pointer']),
            LogicCharacterData_getCollisionRadius:
                new NativeFunction(base.add(offsets.LogicCharacterData_getCollisionRadius), 'uint32', ['pointer']),
            LogicCharacterClient_getLinkedCarryable:
                new NativeFunction(base.add(offsets.LogicCharacterClient__getLinkedCarryable), 'pointer', ['pointer']),
            LogicPlayerMapUtil_tileDataToTileCode:
                new NativeFunction(base.add(offsets.LogicPlayerMapUtil__tileDataToTileCode), 'int', ['pointer']),
            BattleScreen_getLogicBattleModeClient:
                new NativeFunction(base.add(offsets.GameScreen__getLogicBattle), 'pointer', ['pointer']),
            StringTable_getMovieClip:
                new NativeFunction(base.add(offsets.StringTable_getMovieClip), "pointer", ["pointer", "pointer", "bool"]),
            GameButtonCtor:
                new NativeFunction(base.add(offsets.GameButtonCtor), "void", ["pointer"]),
            CustomButton_SetMovieClip:
                new NativeFunction(base.add(offsets.CustomButton_SetMovieClip), "pointer", ["pointer", "pointer", "bool"]),
            MovieClip_gotoAndStopFrameIndex:
                new NativeFunction(base.add(offsets.MovieClip_gotoAndStopFrameIndex), "void", ["pointer", "int"]),
            DisplayObject_setXY:
                new NativeFunction(base.add(offsets.DisplayObject_setXY), "void", ["pointer", "float", "float"]),
            TextField_setText_ui:
                new NativeFunction(base.add(offsets.TextField_setText_ui), "pointer", ["pointer", "pointer", "bool"]),
            MovieClip_getTextFieldByName:
                new NativeFunction(base.add(offsets.MovieClip_getTextFieldByName), "pointer", ["pointer", "pointer"]),
            MovieClip_setChildVisible:
                new NativeFunction(base.add(offsets.MovieClip_setChildVisible), "void", ["pointer", "pointer", "bool"]),
            TextField_setText:
                new NativeFunction(base.add(offsets.TextField_setText), "pointer", ["pointer", "pointer"]),
            origAddFile:
                new NativeFunction(base.add(offsets.ResourceListener_addFile), "void", ["pointer", "pointer", "pointer"]),
            addChildWatermark:
                new NativeFunction(base.add(offsets.Stage_addChild), "pointer", ["pointer", "pointer"]),
    };

    return _n;
}

function getFunctions() {
    if (!_n) throw new Error("Functions not initialized! Call initFunctions(base) first.");
    return _n;
}

let g_wallCache    = null;
let g_wallCacheBytes = null;
let g_wallCacheW   = 0;
let g_wallCacheH   = 0;
let g_builtForPtr  = null;

function rebuildWallCache(tm) {
    if (!tm || tm.isNull()) return;
    if (g_wallCache && g_builtForPtr && !g_builtForPtr.isNull() && g_builtForPtr.equals(tm)) return;

    try {
        const w = tm.add(offsets.TileMap_Width).readS32();
        const h = tm.add(offsets.TileMap_Height).readS32();
        if (w <= 0 || w > 120 || h <= 0 || h > 120) return;

        const tilesArr = tm.add(offsets.TileMap_TilesArray).readPointer();
        if (tilesArr.isNull()) return;

        const total = w * h;
        if (total <= 0 || total > 14400) return;

        const cache = (!g_wallCache || g_wallCacheW !== w || g_wallCacheH !== h)
            ? Memory.alloc(total)
            : g_wallCache;

        for (let i = 0; i < total; i++) {
            try {
                const rtile = tilesArr.add(i * offsets.ObjectManager_ptrStride).readPointer();
                if (rtile.isNull()) { cache.add(i).writeU8(0); continue; }

                const ttype = rtile.readPointer();
                if (ttype.isNull()) { cache.add(i).writeU8(0); continue; }

                const flags = ttype.add(offsets.TileTypeData_BlocksMovement).readU16();
                const blocksMove = flags & 0xFF;
                const blocksPrj  = (flags >> 8) & 0xFF;
                cache.add(i).writeU8((blocksMove ? 0x80 : 0) | (blocksPrj ? 0x40 : 0));
            } catch (_) {
                cache.add(i).writeU8(0);
            }
        }

        g_wallCache   = cache;
        g_wallCacheBytes = new Uint8Array(cache.readByteArray(total));
        g_wallCacheW  = w;
        g_wallCacheH  = h;
        g_builtForPtr = tm;
    } catch (_) {}
}

function initWallCache(base) {
    let g_tileMapPtr = null;

    Interceptor.attach(base.add(offsets.LogicTileMap_getTile), {
        onEnter: function(args) { g_tileMapPtr = args[0]; }
    });

    setInterval(function() {
        if (g_tileMapPtr && !g_tileMapPtr.isNull()) {
            try { rebuildWallCache(g_tileMapPtr); } catch (_) {}
        }
    }, 1000);
}

function getWallCache()  { return g_wallCacheBytes;  }
function getWallCacheW() { return g_wallCacheW; }
function getWallCacheH() { return g_wallCacheH; }

const BRAWLER_RANGE = {
    0: 2800, 1: 3300, 2: 2000, 3: 3300, 4: 3500, 5: 2800,
    6: 2700, 7: 3300, 8: 2200, 9: 2700, 10: 1100, 11: 1000,
    12: 3200, 13: 2600, 14: 3200, 15: 3700, 16: 3300, 17: 2900,
    18: 2200, 19: 3200, 20: 2200, 21: 2100, 22: 3200, 23: 3500,
    24: 1300, 25: 3100, 26: 1300, 27: 3700, 28: 2200, 29: 3700,
    30: 2400, 31: 2600, 32: 3100, 34: 1200, 35: 3100, 36: 3200,
    37: 1800, 38: 2400, 39: 3200, 40: 3100, 41: 3400, 42: 3700,
    43: 700, 44: 3300, 45: 2800, 46: 3700, 47: 2800, 48: 2800,
    49: 1000, 50: 3100, 51: 1700, 52: 3300, 53: 3300, 54: 1000,
    56: 3400, 57: 1500, 58: 3300, 59: 3300, 60: 1100, 61: 3400,
    62: 2000, 63: 3100, 64: 3300, 65: 3300, 67: 2700, 68: 3200,
    69: 1200, 70: 2000, 71: 1200, 72: 3300, 73: 2400, 74: 3300,
    75: 1500, 76: 1300, 77: 2700, 78: 2900, 79: 3700, 80: 1500,
    81: 700, 82: 2300, 83: 2800, 84: 1800, 85: 1000, 86: 1300,
    87: 2300, 88: 2800, 89: 2300, 90: 2900, 91: 3100, 92: 3100,
    93: 1000, 94: 200, 95: 1200, 98: 3700, 99: 1200,
};

const BRAWLER_PROJ_SPEED = {
    0: 3100, 1: 4000, 2: 2853, 3: 2700, 4: 3478, 5: 2174,
    6: 1750, 7: 2870, 8: 2718, 9: 1900, 10: 3261, 12: 3261,
    13: 2500, 14: 2800, 15: 4000, 16: 4130, 17: 3152, 18: 4000,
    19: 3400, 20: 5000, 21: 3200, 23: 3500, 24: 5000, 25: 3000,
    27: 4500, 28: 3500, 29: 3255, 30: 1500, 31: 3000, 32: 4000,
    35: 3000, 36: 4000, 37: 1700, 38: 3500, 39: 4000, 40: 3500,
    41: 4000, 42: 4000, 43: 3500, 44: 3800, 45: 3300, 46: 4000,
    47: 4000, 49: 4000, 50: 3100, 51: 5000, 52: 4000, 53: 4500,
    54: 3200, 56: 3500, 57: 3650, 58: 3800, 59: 3600, 60: 5000,
    61: 4000, 62: 4200, 63: 3300, 64: 3804, 65: 3800, 67: 1750,
    68: 3000, 70: 3800, 72: 4000, 73: 1750, 74: 4200, 77: 2000,
    78: 4500, 79: 4000, 80: 3800, 81: 3500, 82: 2200, 83: 3500,
    84: 2800, 87: 1750, 88: 3000, 89: 3000, 90: 3500, 91: 3000,
    92: 3700, 98: 4000,
};

const BRAWLER_PROJ_HITBOX = {
    1: 17, 3: 34, 4: 34, 5: 50, 7: 50, 8: 83,
    10: 50, 12: 17, 13: 50, 14: 23, 15: 34, 16: 17,
    17: 33, 19: 50, 20: 50, 21: 50, 23: 33, 24: 50,
    25: 83, 27: 17, 28: 67, 29: 50, 30: 67, 31: 67,
    32: 17, 35: 17, 36: 13, 37: 17, 38: 50, 39: 50,
    40: 67, 41: 17, 42: 50, 43: 100, 44: 23, 45: 50,
    46: 34, 47: 17, 49: 83, 50: 17, 51: 83, 52: 50,
    53: 33, 54: 100, 56: 33, 57: 33, 58: 50, 59: 33,
    60: 50, 61: 50, 62: 83, 63: 33, 64: 17, 65: 33,
    68: 34, 70: 33, 72: 33, 73: 67, 74: 50, 78: 42,
    79: 33, 80: 67, 81: 100, 83: 50, 84: 50, 88: 34,
    89: 33, 90: 57, 91: 33, 92: 75, 98: 33,
};

const BRAWLER_HITBOX = {
    0: 40, 1: 40, 2: 50, 3: 40, 4: 40, 5: 40,
    6: 40, 7: 40, 8: 40, 9: 40, 10: 50, 11: 40,
    12: 40, 13: 40, 14: 40, 15: 40, 16: 50, 17: 40,
    18: 50, 19: 40, 20: 50, 21: 40, 22: 40, 23: 40,
    24: 50, 25: 40, 26: 40, 27: 50, 28: 50, 29: 40,
    30: 40, 31: 40, 32: 40, 34: 50, 35: 40, 36: 40,
    37: 40, 38: 40, 39: 40, 40: 40, 41: 40, 42: 40,
    43: 40, 44: 40, 45: 40, 46: 40, 47: 40, 48: 40,
    49: 40, 50: 40, 51: 50, 52: 40, 53: 40, 54: 50,
    56: 40, 57: 40, 58: 40, 59: 40, 60: 50, 61: 40,
    62: 40, 63: 40, 64: 40, 65: 40, 67: 40, 68: 40,
    69: 50, 70: 40, 71: 50, 72: 50, 73: 50, 74: 40,
    75: 40, 76: 40, 77: 40, 78: 40, 79: 40, 80: 40,
    81: 40, 82: 40, 83: 40, 84: 40, 85: 40, 86: 40,
    87: 40, 88: 40, 89: 40, 90: 40, 91: 40, 92: 50,
    93: 40, 94: 40, 95: 50, 98: 40, 99: 40,
};

const RANGE_BY_NAME = {
    '8-BIT': 3700, 'ALLI': 200, 'AMBER': 3100, 'ANGELO': 3700,
    'ASH': 1700, 'BARLEY': 2700, 'BEA': 3700, 'BELLE': 3700,
    'BERRY': 2300, 'BIBI': 1300, 'BO': 3200, 'BONNIE': 3300,
    'BROCK': 3300, 'BULL': 2000, 'BUSTER': 2000, 'BUZZ': 1000,
    'BYRON': 3700, 'CARL': 3100, 'CHARLIE': 3300, 'CHESTER': 3100,
    'CHUCK': 2400, 'CLANCY': 2800, 'COLETTE': 3200, 'COLT': 3300,
    'CORDELIUS': 2000, 'CROW': 3200, 'DARRYL': 2200, 'DOUG': 1200,
    'DRACO': 1500, 'DYNAMIKE': 2700, 'EDGAR': 700, 'EL_PRIMO': 1100,
    'EMZ': 2400, 'EVE': 3400, 'FANG': 1000, 'FINX': 3100,
    'FRANK': 2200, 'GALE': 3100, 'GENE': 2100, 'GIGI': 1200,
    'GRAY': 3300, 'GRIFF': 3100, 'GROM': 2800, 'GUS': 3400,
    'HANK': 1200, 'JACKY': 1200, 'JAE': 3100, 'JANET': 1500,
    'JESSIE': 3300, 'JUJU': 2300, 'KAZE': 1000, 'KENJI': 1000,
    'KIT': 1300, 'LARRY_AND_LAWRIE': 2700, 'LEON': 3500, 'LILY': 700,
    'LOLA': 3300, 'LOU': 3400, 'LUMI': 2900, 'MAISIE': 3200,
    'MANDY': 3300, 'MAX': 3100, 'MEEPLE': 2800, 'MEG': 3300,
    'MELODIE': 2900, 'MICO': 1500, 'MOE': 1800, 'MORTIS': 1000,
    'MR_P': 2600, 'NANI': 3200, 'NITA': 2200, 'OLLIE': 2300,
    'OTIS': 3300, 'PAM': 3300, 'PEARL': 3300, 'PENNY': 3200,
    'PIERCE': 3700, 'PIPER': 3700, 'POCO': 2600, 'RICO': 3500,
    'ROSA': 1300, 'RUFFS': 3300, 'SAM': 1100, 'SANDY': 2200,
    'SHADE': 1300, 'SHELLY': 2800, 'SPIKE': 2800, 'SPROUT': 1800,
    'SQUEAK': 2800, 'STU': 2800, 'SURGE': 2400, 'TARA': 2900,
    'TICK': 3200, 'TRUNK': 1200, 'WILLOW': 2700,
};

function distance(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function clampVec(x, y, maxMag) {
    const mag = Math.sqrt(x * x + y * y);
    if (mag <= maxMag || mag < 0.001) return { x, y };
    const s = maxMag / mag;
    return { x: x * s, y: y * s };
}

function estimateTargetVelocity(xArr, yArr, tArr, maxSpeed = 4000) {
    const empty = {
        vx: 0, vy: 0, speed: 0, confident: false,
        directionChanging: false, isJuking: false,
        angularVelocity: 0
    };

    if (xArr.length < 2 || tArr.length < 1) return empty;

    const cumTimes = [0];
    for (let i = 0; i < tArr.length && i < xArr.length - 1; i++) {
        const dt = tArr[i];
        cumTimes.push(cumTimes[cumTimes.length - 1] + (dt <= 0 || dt > 2000 ? 50 : dt));
    }

    const n = Math.min(xArr.length, cumTimes.length);
    if (n < 2) return empty;

    const tSec = [];
    for (let i = 0; i < n; i++) {
        tSec.push((cumTimes[i] - cumTimes[n - 1]) / 1000);
    }

    const decayRate = 3.0;
    const weights = tSec.map(t => Math.exp(decayRate * t));

    let sumW = 0, sumWt = 0, sumWt2 = 0;
    let sumWx = 0, sumWtx = 0, sumWy = 0, sumWty = 0;

    for (let i = 0; i < n; i++) {
        const w = weights[i], t = tSec[i];
        sumW += w; sumWt += w * t; sumWt2 += w * t * t;
        sumWx += w * xArr[i]; sumWtx += w * t * xArr[i];
        sumWy += w * yArr[i]; sumWty += w * t * yArr[i];
    }

    const denom = sumW * sumWt2 - sumWt * sumWt;
    if (Math.abs(denom) < 1e-10) return empty;

    let vx = (sumW * sumWtx - sumWt * sumWx) / denom;
    let vy = (sumW * sumWty - sumWt * sumWy) / denom;

    const clamped = clampVec(vx, vy, maxSpeed);
    vx = clamped.x; vy = clamped.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    let totalAngleChange = 0, validAnglePairs = 0;
    let signChangesX = 0, signChangesY = 0;

    for (let i = 2; i < n; i++) {
        const dt1 = (cumTimes[i - 1] - cumTimes[i - 2]) / 1000;
        const dt2 = (cumTimes[i] - cumTimes[i - 1]) / 1000;
        if (dt1 < 0.005 || dt2 < 0.005) continue;

        const vx1 = (xArr[i-1]-xArr[i-2])/dt1, vy1 = (yArr[i-1]-yArr[i-2])/dt1;
        const vx2 = (xArr[i]-xArr[i-1])/dt2, vy2 = (yArr[i]-yArr[i-1])/dt2;

        if (vx1 * vx2 < 0) signChangesX++;
        if (vy1 * vy2 < 0) signChangesY++;

        const s1 = Math.sqrt(vx1*vx1+vy1*vy1), s2 = Math.sqrt(vx2*vx2+vy2*vy2);
        if (s1 > 30 && s2 > 30) {
            let angleDiff = Math.atan2(vy2, vx2) - Math.atan2(vy1, vx1);
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            totalAngleChange += Math.abs(angleDiff);
            validAnglePairs++;
        }
    }

    const avgAngleChange = validAnglePairs > 0 ? totalAngleChange / validAnglePairs : 0;
    const isJuking = (n >= 5 && speed > 200 && (signChangesX + signChangesY) / (2 * Math.max(1, n-2)) > 0.35);

    return {
        vx, vy, speed,
        confident: n >= 4,
        directionChanging: avgAngleChange > 0.3,
        isJuking,
        angularVelocity: avgAngleChange
    };
}

function solveIntercept(ownX, ownY, targetX, targetY, targetVel, projSpeed, profile = null) {
    if (projSpeed <= 0) return { x: targetX, y: targetY, time: 0 };
    const d = distance(ownX, ownY, targetX, targetY);
    if (d < 100) return { x: targetX, y: targetY, time: 0 };

    let t = d / projSpeed;
    const maxPredTime = Math.min(1.5, d / (projSpeed * 0.3));

    for (let iter = 0; iter < 6; iter++) {
        let futureX = targetX + targetVel.vx * t;
        let futureY = targetY + targetVel.vy * t;

        if (targetVel.directionChanging && targetVel.angularVelocity > 0.3 && targetVel.speed > 100) {
            const curveBlend = profile ? profile.params.curveBlend : 0.2;
            const currentAngle = Math.atan2(targetVel.vy, targetVel.vx);
            const dampedOmega = targetVel.angularVelocity * 0.35;
            const futureAngle = currentAngle + dampedOmega * t;
            const circX = targetX + targetVel.speed * Math.cos(futureAngle) * t;
            const circY = targetY + targetVel.speed * Math.sin(futureAngle) * t;
            const b = Math.min(curveBlend, 0.3);
            futureX = futureX * (1 - b) + circX * b;
            futureY = futureY * (1 - b) + circY * b;
        }

        const newT = Math.min(distance(ownX, ownY, futureX, futureY) / projSpeed, maxPredTime);
        if (Math.abs(newT - t) < 0.001) break;
        t = newT;
    }

    return {
        x: targetX + targetVel.vx * t,
        y: targetY + targetVel.vy * t,
        time: t
    };
}

const MODE_BUF_SIZE = 20;
const POS_BUF_SIZE = 60;

class PlayerProfile {
    constructor(playerIndex) {
        this.playerIndex = playerIndex;
        this.samples = 0;
        this.stationarySamples = 0;
        this.linearSamples = 0;
        this.jukeSamples = 0;
        this.curveSamples = 0;

        this.avgSpeed = 0;
        this.avgAngularVelocity = 0;
        this.jukeFrequency = 0;

        this.params = {
            leadFactor: 1.0,
            curveBlend: 0.2,
        };

        this._modes = new Array(MODE_BUF_SIZE);
        this._modesIdx = 0;
        this._modesCount = 0;

        this._posX = new Float32Array(POS_BUF_SIZE);
        this._posY = new Float32Array(POS_BUF_SIZE);
        this._posIdx = 0;
        this._posCount = 0;

        this._jukeCenter = null;
        this._jukeCenterWeight = 0;
    }

    recordMovement(vel, aimMode) {
        this.samples++;
        switch (aimMode) {
            case "STATIONARY": this.stationarySamples++; break;
            case "JUKE": this.jukeSamples++; break;
            case "PREDICT_CURVE": this.curveSamples++; break;
            case "PREDICT_LINEAR": this.linearSamples++; break;
        }

        const alpha = Math.min(0.15, 5 / (this.samples + 5));
        this.avgSpeed = this.avgSpeed * (1 - alpha) + vel.speed * alpha;
        this.avgAngularVelocity = this.avgAngularVelocity * (1 - alpha) + vel.angularVelocity * alpha;

        this._modes[this._modesIdx] = aimMode;
        this._modesIdx = (this._modesIdx + 1) % MODE_BUF_SIZE;
        if (this._modesCount < MODE_BUF_SIZE) this._modesCount++;

        if (this._modesCount >= 6) {
            let jukes = 0;
            for (let i = 0; i < this._modesCount; i++) {
                if (this._modes[i] === "JUKE") jukes++;
            }
            this.jukeFrequency = jukes / this._modesCount;
        }
    }

    recordPosition(x, y) {
        this._posX[this._posIdx] = x;
        this._posY[this._posIdx] = y;
        this._posIdx = (this._posIdx + 1) % POS_BUF_SIZE;
        if (this._posCount < POS_BUF_SIZE) this._posCount++;
    }

    adaptParameters() {
        if (this.samples < 10) return;
        const p = this.params;
        if (this.avgAngularVelocity > 0.6) {
            p.leadFactor = 0.8;
            p.curveBlend = 0.3;
        } else if (this.avgAngularVelocity > 0.3) {
            p.leadFactor = 0.9;
            p.curveBlend = 0.2;
        } else {
            p.leadFactor = 1.0;
            p.curveBlend = 0.1;
        }

        if (this.jukeFrequency > 0.3 && this._posCount >= 8) {
            const n = Math.min(12, this._posCount);
            let sumX = 0, sumY = 0;
            let idx = this._posIdx - 1;
            for (let i = 0; i < n; i++) {
                if (idx < 0) idx += POS_BUF_SIZE;
                sumX += this._posX[idx];
                sumY += this._posY[idx];
                idx--;
            }
            this._jukeCenter = { x: sumX / n, y: sumY / n };
            this._jukeCenterWeight = Math.min(0.3, this.jukeFrequency * 0.35);
        } else {
            this._jukeCenter = null;
            this._jukeCenterWeight = 0;
        }
    }

    getPlayStyle() {
        if (this.samples < 10) return "UNKNOWN";
        const total = this.samples;
        if (this.stationarySamples / total > 0.6) return "CAMPER";
        if (this.jukeSamples / total > 0.3) return "JUKER";
        if (this.curveSamples / total > 0.3) return "STRAFER";
        if (this.linearSamples / total > 0.5) return "RUNNER";
        return "MIXED";
    }
}

class ProfileManager {
    constructor() {
        this.profiles = new Map();
    }

    getProfile(targetId) {
        if (!this.profiles.has(targetId)) {
            this.profiles.set(targetId, new PlayerProfile(targetId));
        }
        return this.profiles.get(targetId);
    }

    clear(targetId) {
        this.profiles.delete(targetId);
    }

    clearAll() {
        this.profiles.clear();
    }
}

const profileManager = new ProfileManager();

let _scannerBase = null;
const SCAN_INTERVAL_MS = 33;
let _lastScanTime = 0;

const scanData = {
    ownCharacter: ptr(0),
    myTeamId: 0,
    myX: 0,
    myY: 0,
    myRadius: 60,
    mySpeed: 720,
    myBrawlerId: 0,
    myBrawlerName: null,
    enemies: [],
    projectiles: [],
    lastUpdate: 0
};

function readHeroIconName(data) {
    const offs = [0x48, 0x50, 0x40, 0x58];
    for (let i = 0; i < offs.length; i++) {
        try {
            const namePtr = data.add(offs[i]).readPointer();
            if (!namePtr || namePtr.isNull()) continue;
            const str = namePtr.readCString();
            if (!str) continue;
            if (str.startsWith('hero_icon_')) return str.substring(10).toUpperCase();
            if (str.length > 2 && str.length < 32 && /^[A-Za-z0-9_]+$/.test(str)) return str.toUpperCase();
        } catch (_) {}
    }
    return null;
}

function updateScanner(bm) {
    if (!_scannerBase) return;
    const now = Date.now();
    if (now - _lastScanTime < SCAN_INTERVAL_MS) return;
    _lastScanTime = now;
    const functions = getFunctions();

    try {
        const own = functions.LogicBattleModeClient_getOwnCharacter(bm);
        if (!own || own.isNull()) {
            scanData.ownCharacter = null;
            scanData.lastUpdate = 0;
            return;
        }

        scanData.ownCharacter = own;
        scanData.myTeamId = functions.LogicBattleModeClient_getOwnPlayerTeam(bm);
        scanData.myX = functions.LogicGameObjectClient_getX(own) | 0;
        scanData.myY = functions.LogicGameObjectClient_getY(own) | 0;
        scanData.mySpeed = 720;

        const ownData = functions.LogicGameObjectClient_getData(own);
        if (ownData && !ownData.isNull()) {
            scanData.myRadius = functions.LogicCharacterData_getCollisionRadius(ownData) || 60;
            try {
                scanData.myBrawlerId = ownData.add(offsets.CharData_brawlerId).readU8() | 0;
            } catch (_) { }
            try {
                const readSpeed = ownData.add(offsets.CharData_speed).readU32();
                if (readSpeed >= 300 && readSpeed <= 2500) scanData.mySpeed = readSpeed;
            } catch (_) { }
            try {
                const nameRead = readHeroIconName(ownData);
                if (nameRead) scanData.myBrawlerName = nameRead;
            } catch (_) { }
        }

        const objMgr = bm.add(offsets.BattleMode_objectManagerPtr).readPointer();
        if (!objMgr || objMgr.isNull()) return;

        const objects = objMgr.add(offsets.ObjectManager_objectsArray).readPointer();
        const count = objMgr.add(offsets.ObjectManager_count).readU32();
        if (!objects || objects.isNull() || count === 0 || count > 1200) return;

        const enemies = [];
        const projectiles = [];
        const vtableProj = _scannerBase.add(offsets.VTABLE_PROJECTILE_DATA);
        const stride = offsets.ObjectManager_ptrStride;

        for (let i = 0; i < count; i++) {
            try {
                const obj = objects.add(i * stride).readPointer();
                if (!obj || obj.isNull()) continue;

                const team = obj.add(offsets.GameObj_team).readU32();
                const isEnemy = (team !== scanData.myTeamId);

                const data = functions.LogicGameObjectClient_getData(obj);
                if (!data || data.isNull()) continue;

                const isProjectile = data.readPointer().equals(vtableProj);

                if (isProjectile) {
                    if (!isEnemy) continue;
                    if (obj.add(offsets.GameObj_deadFlag).readU32() !== 0) continue;

                    let spawnAngle = null;
                    try {
                        const raw = obj.add(offsets.Projectile_spawnAngle).readFloat();
                        if (isFinite(raw)) spawnAngle = raw;
                    } catch (_) { }

                    let isBeam = false;
                    try {
                        if (_isBeamFn) isBeam = !!_isBeamFn(data);
                    } catch (_) { }

                    projectiles.push({
                        gid: functions.LogicGameObjectClient_getGlobalID(obj).toString(),
                        x: functions.LogicGameObjectClient_getX(obj) | 0,
                        y: functions.LogicGameObjectClient_getY(obj) | 0,
                        speed: functions.LogicProjectileData_getSpeed(data) || 1200,
                        radius: functions.LogicProjectileData_getRadius(data) || 8,
                        spawnAngle: spawnAngle,
                        isBeam: isBeam
                    });
                } else {
                    if (!isEnemy || obj.equals(own)) continue;
                    if (obj.add(offsets.GameObj_deadFlag).readU32() !== 0) continue;

                    const gid = functions.LogicGameObjectClient_getGlobalID(obj).toString();

                    let brawlerName = _brawlerNameCache[gid];
                    if (brawlerName === undefined) {
                        brawlerName = readHeroIconName(data);
                        _brawlerNameCache[gid] = brawlerName;
                    }

                    let moveSpeed = 0;
                    try {
                        const sp = data.add(offsets.CharData_speed).readU32();
                        if (sp >= 300 && sp <= 8500) moveSpeed = sp;
                    } catch (_) { }

                    enemies.push({
                        gid: gid,
                        x: functions.LogicGameObjectClient_getX(obj) | 0,
                        y: functions.LogicGameObjectClient_getY(obj) | 0,
                        brawlerId: data.add(offsets.CharData_brawlerId).readU8() | 0,
                        brawlerName: brawlerName,
                        teamId: team,
                        moveSpeed: moveSpeed
                    });
                }
            } catch (_) { }
        }

        const _activeGids = new Set(enemies.map(e => e.gid));
        for (const gid of Object.keys(_brawlerNameCache)) {
            if (_brawlerNameCache[gid] !== null && !_activeGids.has(gid)) delete _brawlerNameCache[gid];
        }

        scanData.enemies = enemies;
        scanData.projectiles = projectiles;
        scanData.lastUpdate = now;
    } catch (_) { }
}

let _isBeamFn = null;
let _brawlerNameCache = {};

function resetScannerCache() {
    _brawlerNameCache = {};
}

function initScanner(base) {
    _scannerBase = base;
    try {
        _isBeamFn = new NativeFunction(base.add(offsets.LogicProjectileData__isBeam), 'bool', ['pointer']);
    } catch (_) { _isBeamFn = null; }
}

const SHOOT_LAG_S = 0.025;

const WEAPON_SPREAD_INFO = {
    0:  { spreadAngle: 30, bulletCount: 5 },
    2:  { spreadAngle: 45, bulletCount: 5 },
    4:  { spreadAngle: 0,  bulletCount: 1, hasRicoBounce: true },
    12: { spreadAngle: 22, bulletCount: 3 },
    13: { spreadAngle: 65, bulletCount: 4 },
    16: { spreadAngle: 30, bulletCount: 1 },
    17: { spreadAngle: 25, bulletCount: 3 },
    18: { spreadAngle: 40, bulletCount: 5 },
    28: { spreadAngle: 40, bulletCount: 3 },
    30: { spreadAngle: 40, bulletCount: 5 },
    35: { spreadAngle: 0,  bulletCount: 6 },
    36: { spreadAngle: 25, bulletCount: 3 },
    50: { spreadAngle: 15, bulletCount: 3 },
    63: { spreadAngle: 15, bulletCount: 4 },
};

const AIM_CFG = {
    HISTORY_LEN:         10,
    STALE_MS:            1500,
    STATIONARY_THRESHOLD: 50,
    SCORE_DIST_WEIGHT:   1.0,
    SCORE_SPEED_WEIGHT:  0.3,
    SCORE_APPROACH_WEIGHT: 0.4,
};

let targets = {};
let bestTargetId = null;
let _lastCleanupTs = 0;
let ownProjSpeed = 3000;
let _burstLockPos = null;
let _burstLockUntil = 0;
const BURST_LOCK_MS = 200;
const EMA_ALPHA = 0.4;

function getAimbotTargets() { return targets; }
function getAimbotBestTargetId() { return bestTargetId; }

function resetAimbot() {
    targets = {};
    bestTargetId = null;
    _lastCleanupTs = 0;
    ownProjSpeed = 3000;
    _burstLockPos = null;
    _burstLockUntil = 0;
    _battleScreen = null;
    _battleScreenTs = 0;
}

function RingBuf(max) { this.d = []; this.max = max; }
RingBuf.prototype.push = function (v) {
    this.d.push(v);
    if (this.d.length > this.max) this.d.shift();
};
RingBuf.prototype.clear = function () { this.d = []; };

function losCheck(wx0, wy0, wx1, wy1, checkBit) {
    const wc = getWallCache();
    if (!wc) return true;
    const w = getWallCacheW(), h = getWallCacheH();
    let cx = (wx0 / 300) | 0, cy = (wy0 / 300) | 0;
    const tx1 = (wx1 / 300) | 0, ty1 = (wy1 / 300) | 0;
    const dx = Math.abs(tx1 - cx), dy = -Math.abs(ty1 - cy);
    const sx = cx < tx1 ? 1 : -1, sy = cy < ty1 ? 1 : -1;
    let err = dx + dy, n = 120;
    while (n-- > 0) {
        if (cx >= 0 && cx < w && cy >= 0 && cy < h && (wc[cy * w + cx] & checkBit)) return false;
        if (cx === tx1 && cy === ty1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
    }
    return true;
}

function hasLineOfSight(x0, y0, x1, y1) {
    return losCheck(x0, y0, x1, y1, 0x40);
}

function calculateRicoBounceAim(ownX, ownY, targetX, targetY, targetHitbox) {
    const projSpeed = 2520;
    const effectiveR = targetHitbox + 15;
    let bestAngle = Math.atan2(targetY - ownY, targetX - ownX);
    let bestDist = 1e18;
    for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * (Math.PI * 2);
        let bx = ownX, by = ownY;
        let bvx = Math.cos(angle) * projSpeed, bvy = Math.sin(angle) * projSpeed;
        let bounces = 0;
        for (let step = 0; step < 60 && bounces <= 2; step++) {
            bx += bvx * 0.02; by += bvy * 0.02;
            if (bx < 0 || bx > 9000) { bvx = -bvx; bounces++; }
            if (by < 0 || by > 9000) { bvy = -bvy; bounces++; }
            const hitD = Math.sqrt((bx - targetX) ** 2 + (by - targetY) ** 2);
            if (hitD <= effectiveR && bounces >= 1) {
                if (hitD < bestDist) { bestDist = hitD; bestAngle = angle; }
                break;
            }
        }
    }
    return bestAngle;
}

function updateOwnProjSpeed() {
    try {
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return;
        const fns = getFunctions();
        const data = fns.LogicGameObjectClient_getData(own);
        if (!data || data.isNull()) return;
        const bid = data.add(offsets.CharData_brawlerId).readU8() | 0;
        const known = BRAWLER_PROJ_SPEED[bid];
        if (known !== undefined && known > 0) ownProjSpeed = known;
    } catch (_) {}
}

function resolveProjSpeed() {
    return BRAWLER_PROJ_SPEED[scanData.myBrawlerId] || ownProjSpeed || 3000;
}

function computeAimForTarget(targetId, ownX, ownY) {
    const tgt = targets[targetId];
    if (!tgt || tgt.histX.d.length < 2) return null;
    const targetVel = estimateTargetVelocity(tgt.histX.d, tgt.histY.d, tgt.histT.d);
    const intercept = solveIntercept(ownX, ownY, tgt.x, tgt.y, targetVel, resolveProjSpeed());
    if (!isFinite(intercept.x) || !isFinite(intercept.y)) return null;
    return { x: Math.round(intercept.x), y: Math.round(intercept.y) };
}

function setupAimbot(base) {
    Interceptor.attach(base.add(offsets.BattleScreen__updateAutoshoot), {
        onEnter: function (args) {
            _battleScreen = args[0];
            _battleScreenTs = Date.now();
        }
    });

    Interceptor.attach(base.add(offsets.BattleScreen_activateSkill), {
        onEnter: function (args) {
            if (!state.aimbot) return;
            if (scanData.lastUpdate === 0) return;
            const enemyId = bestTargetId;
            if (!enemyId || !targets[enemyId]) return;

            const nowMs = Date.now();

            if (_burstLockPos && nowMs < _burstLockUntil) {
                try {
                    args[1] = ptr(Math.round(_burstLockPos.x));
                    args[2] = ptr(Math.round(_burstLockPos.y));
                } catch (_) {}
                return;
            }

            const tgt = targets[enemyId];
            const myX = scanData.myX, myY = scanData.myY, myBrawlerId = scanData.myBrawlerId;
            const targetHitbox = BRAWLER_HITBOX[tgt.brawlerId] || 40;

            const dodge = getDodgeDir();
            const mySpd = scanData.mySpeed || 720;
            const effectMyX = myX + (dodge ? dodge.x * mySpd * SHOOT_LAG_S : 0);
            const effectMyY = myY + (dodge ? dodge.y * mySpd * SHOOT_LAG_S : 0);

            const gameSpeed = tgt.moveSpeed || 720;
            const stationaryThreshold = Math.max(30, gameSpeed * 0.07);
            function clampV(vx, vy) {
                const sp = Math.sqrt(vx * vx + vy * vy);
                if (sp < 1e-6 || sp <= gameSpeed * 1.1) return { vx, vy };
                const sc = (gameSpeed * 1.1) / sp;
                return { vx: vx * sc, vy: vy * sc };
            }

            let aimPos = null;

            try {
                if (myBrawlerId === 12) {
                    const angle = calculateRicoBounceAim(effectMyX, effectMyY, tgt.x, tgt.y, targetHitbox);
                    aimPos = { x: effectMyX + Math.cos(angle) * 1000, y: effectMyY + Math.sin(angle) * 1000 };
                } else if (WEAPON_SPREAD_INFO[myBrawlerId]) {
                    const projSpeedSpread = BRAWLER_PROJ_SPEED[myBrawlerId] || ownProjSpeed;
                    const distSpread = Math.sqrt((tgt.x - effectMyX) ** 2 + (tgt.y - effectMyY) ** 2);
                    const tFlight = distSpread / projSpeedSpread;
                    const { vx: cvxS, vy: cvyS } = clampV(tgt.emaVx || 0, tgt.emaVy || 0);
                    const lx = tgt.x + cvxS * tFlight;
                    const ly = tgt.y + cvyS * tFlight;
                    const toL = { x: lx - effectMyX, y: ly - effectMyY };
                    const toT = { x: tgt.x - effectMyX, y: tgt.y - effectMyY };
                    aimPos = (toL.x * toT.x + toL.y * toT.y > 0)
                        ? { x: lx, y: ly }
                        : { x: tgt.x, y: tgt.y };
                } else {
                    const projSpeed = BRAWLER_PROJ_SPEED[myBrawlerId] || ownProjSpeed;
                    const profile = profileManager.getProfile(enemyId);
                    const rawVel = estimateTargetVelocity(tgt.histX.d, tgt.histY.d, tgt.histT.d);

                    const { vx: emaVxC, vy: emaVyC } = clampV(tgt.emaVx || 0, tgt.emaVy || 0);
                    const blendA = rawVel.speed > stationaryThreshold ? 0.5 : 0.3;
                    const bvx = rawVel.vx * (1 - blendA) + emaVxC * blendA;
                    const bvy = rawVel.vy * (1 - blendA) + emaVyC * blendA;
                    const targetVel = {
                        ...rawVel,
                        vx: bvx, vy: bvy,
                        speed: Math.sqrt(bvx * bvx + bvy * bvy),
                    };

                    const isStationary = targetVel.speed < stationaryThreshold;
                    const aimMode = isStationary ? "STATIONARY"
                        : targetVel.isJuking ? "JUKE"
                        : targetVel.directionChanging ? "PREDICT_CURVE"
                        : "PREDICT_LINEAR";
                    profile.recordMovement(targetVel, aimMode);
                    if (profile.samples % 10 === 0) profile.adaptParameters();

                    if (isStationary) {
                        aimPos = { x: tgt.x, y: tgt.y };
                    } else if (targetVel.isJuking && profile._jukeCenter && profile._jukeCenterWeight > 0) {
                        const intercept = solveIntercept(effectMyX, effectMyY, tgt.x, tgt.y, targetVel, projSpeed, profile);
                        const w = profile._jukeCenterWeight;
                        aimPos = {
                            x: intercept.x * (1 - w) + profile._jukeCenter.x * w,
                            y: intercept.y * (1 - w) + profile._jukeCenter.y * w,
                        };
                    } else {
                        aimPos = solveIntercept(effectMyX, effectMyY, tgt.x, tgt.y, targetVel, projSpeed, profile);
                    }

                    const lead = profile.params.leadFactor || 1.0;
                    if (lead !== 1.0 && !isStationary) {
                        aimPos.x = tgt.x + (aimPos.x - tgt.x) * lead;
                        aimPos.y = tgt.y + (aimPos.y - tgt.y) * lead;
                    }

                    const toTgt = { x: tgt.x - effectMyX, y: tgt.y - effectMyY };
                    const toAim = { x: aimPos.x - effectMyX, y: aimPos.y - effectMyY };
                    if (toTgt.x * toAim.x + toTgt.y * toAim.y < 0) {
                        aimPos = { x: tgt.x, y: tgt.y };
                    }
                }
            } catch (_) {
                aimPos = { x: tgt.x, y: tgt.y };
            }

            if (aimPos && isFinite(aimPos.x) && isFinite(aimPos.y)) {
                _burstLockPos = aimPos;
                _burstLockUntil = nowMs + BURST_LOCK_MS;
                try {
                    args[1] = ptr(Math.round(aimPos.x));
                    args[2] = ptr(Math.round(aimPos.y));
                } catch (_) {}
            }
        }
    });
}

function updateAimbot() {
    if ((!state.aimbot && !state.killaura) || scanData.lastUpdate === 0) return;
    updateOwnProjSpeed();

    const myX = scanData.myX, myY = scanData.myY;
    const now = Date.now();
    bestTargetId = null;
    let bestScore = 1e18;

    for (const enemy of (scanData.enemies || [])) {
        const gid = enemy.gid;
        if (enemy.teamId === scanData.myTeamId) continue;
        if (!hasLineOfSight(myX, myY, enemy.x, enemy.y)) continue;

        if (!targets[gid]) {
            targets[gid] = {
                histX: new RingBuf(AIM_CFG.HISTORY_LEN),
                histY: new RingBuf(AIM_CFG.HISTORY_LEN),
                histT: new RingBuf(AIM_CFG.HISTORY_LEN - 1),
                lastUpdate: now,
                x: enemy.x,
                y: enemy.y,
                brawlerId: enemy.brawlerId,
                emaVx: 0, emaVy: 0,
                moveSpeed: enemy.moveSpeed || 720,
            };
        }

        const t = targets[gid];
        const dt = now - t.lastUpdate;
        if (dt > 0 && dt < 300) {
            const rawVx = (enemy.x - t.x) * 1000 / dt;
            const rawVy = (enemy.y - t.y) * 1000 / dt;
            const alpha = Math.min(EMA_ALPHA, dt / 80);
            t.emaVx = t.emaVx * (1 - alpha) + rawVx * alpha;
            t.emaVy = t.emaVy * (1 - alpha) + rawVy * alpha;
        }
        t.x = enemy.x; t.y = enemy.y; t.brawlerId = enemy.brawlerId;
        if (enemy.moveSpeed > 0) t.moveSpeed = enemy.moveSpeed;
        t.histX.push(enemy.x); t.histY.push(enemy.y);
        if (dt > 0 && dt < 2000) t.histT.push(dt);
        t.lastUpdate = now;

        try { profileManager.getProfile(gid).recordPosition(enemy.x, enemy.y); } catch (_) {}

        const targetVel = estimateTargetVelocity(t.histX.d, t.histY.d, t.histT.d);
        const dx = enemy.x - myX, dy = enemy.y - myY, dist = Math.sqrt(dx * dx + dy * dy);
        const approach = -(dx * targetVel.vx + dy * targetVel.vy) / (dist + 1e-6);
        const score = dist * AIM_CFG.SCORE_DIST_WEIGHT
                    - targetVel.speed * AIM_CFG.SCORE_SPEED_WEIGHT
                    - approach * AIM_CFG.SCORE_APPROACH_WEIGHT;

        if (score < bestScore) {
            bestScore = score;
            bestTargetId = gid;
        }
    }

    if (now - _lastCleanupTs > 1000) {
        for (const id in targets) {
            if (now - targets[id].lastUpdate > AIM_CFG.STALE_MS) {
                delete targets[id];
                try { profileManager.clear(id); } catch (_) {}
            }
        }
        _lastCleanupTs = now;
    }
}

const CONFIG = {
    SAFETY_MARGIN: 25,
    MOVING_EXTRA_MARGIN: 20,
    T_URGENT_MIN: 0.45,
    T_URGENT_MAX: 0.70,
    T_FIELD: 1.0,
    T_RELEASE: 0.22,
    MIN_CLEARANCE: 70,
    DODGE_COMMIT_MS: 70,
    DODGE_MAX_MS: 480,
    DODGE_BUFFER_MS: 60,
    THREAT_LOCK_T: 0.18,
    FIELD_RADIUS: 275,
    N_DIRECTIONS: 16,
    N_COARSE_DIRECTIONS: 8,
    MAX_DIST_SQ: 5000 * 5000,
    STALE_MS: 300,
    PERP_WEIGHT: 1.8,
    AWAY_WEIGHT: 2.2,
    INTENT_WEIGHT: 1.0,
    CHAR_SPEED: 720,
    LAG_COMPENSATION_S: 0.030,
};

const BRAWLER_AOE_IMPACT_RADIUS = {
    6: 220,
    9: 240,
    22: 260,
    37: 240,
    40: 180,
    48: 220,
    82: 200,
};
const PROJECTILE_OWNER_SNAP_DIST_SQ = 950 * 950;
const BURST_WINDOW_MS = 200;
let projectiles = {};
let lastSafeDir = null;
let lastSafeDirTime = 0;
let g_dodgeUntil = 0;
let g_dodgeStart = 0;
let _dodgeDir = null;

let _walkCache = {};
let _walkCacheTileX = -9999;
let _walkCacheTileY = -9999;
let _cachedUrgentWindow = 0.9;
let _cachedUrgentWindowTs = 0;

const _activeProjs = [];
let _maxProjSpeed = 0;

const CACHED_DIRECTIONS = [];
for (let i = 0; i < CONFIG.N_DIRECTIONS; i++) {
    const a = (Math.PI * 2 * i) / CONFIG.N_DIRECTIONS;
    CACHED_DIRECTIONS.push({ x: Math.cos(a), y: Math.sin(a) });
}

function getDodgeDir() { return _dodgeDir; }

function resetAutododge() {
    projectiles = {};
    _activeProjs.length = 0;
    _dodgeDir = null;
    g_dodgeUntil = 0;
    g_dodgeStart = 0;
    lastSafeDir = null;
    lastSafeDirTime = 0;
    _walkCache = {};
    _walkCacheTileX = -9999;
    _walkCacheTileY = -9999;
    _cachedUrgentWindowTs = 0;
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len < 1e-6) return { x: 1, y: 0 };
    return { x: x / len, y: y / len };
}

function isZeroDir(d) { return !d || (Math.abs(d.x) < 1e-6 && Math.abs(d.y) < 1e-6); }

function getUrgentWindow() {
    const now = Date.now();
    if (now - _cachedUrgentWindowTs < 16) return _cachedUrgentWindow;
    const speed = Math.max(420, Math.min(900, CONFIG.CHAR_SPEED || 720));
    const norm = (speed - 420) / (900 - 420);
    let base = CONFIG.T_URGENT_MIN + (1 - norm) * (CONFIG.T_URGENT_MAX - CONFIG.T_URGENT_MIN);
    if (_maxProjSpeed > 1800) {
        base += Math.min(0.25, (_maxProjSpeed - 1800) / (2880 - 1800) * 0.25);
    }
    _cachedUrgentWindow = base;
    _cachedUrgentWindowTs = now;
    return base;
}

function sameDirection(a, b) {
    if (!a || !b) return false;
    return (a.x * b.x + a.y * b.y) > 0.98;
}

function directionDot(a, b) {
    if (!a || !b) return 0;
    return a.x * b.x + a.y * b.y;
}

function isDirectionWalkable(fromX, fromY, dirX, dirY, charRadius) {
    const key = ((fromX / 300) | 0) + '|' + ((fromY / 300) | 0) + '|' + ((dirX * 16) | 0) + '|' + ((dirY * 16) | 0);
    if (_walkCache[key] !== undefined) return _walkCache[key];
    const wc = getWallCache();
    if (!wc) { _walkCache[key] = true; return true; }
    const w = getWallCacheW();
    const h = getWallCacheH();

    function tile(wx, wy) {
        const tx = Math.floor(wx / 300);
        const ty = Math.floor(wy / 300);
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
        try { return wc[ty * w + tx] < 0x80; } catch (_) { return false; }
    }

    const TILE = 300;
    const remainX = dirX > 0 ? (TILE - (((fromX % TILE) + TILE) % TILE)) : dirX < 0 ? (((fromX % TILE) + TILE) % TILE) : TILE;
    const remainY = dirY > 0 ? (TILE - (((fromY % TILE) + TILE) % TILE)) : dirY < 0 ? (((fromY % TILE) + TILE) % TILE) : TILE;
    let main = Math.abs(dirX) >= Math.abs(dirY) ? remainX : remainY;
    if (main < 10) main = TILE;
    let probeD = main + 150;
    if (probeD < 320) probeD = 320;
    const fx = fromX + dirX * probeD;
    const fy = fromY + dirY * probeD;
    const mx = fromX + dirX * (probeD * 0.5);
    const my = fromY + dirY * (probeD * 0.5);
    const pr = charRadius * 0.9;
    const px = -dirY * pr;
    const py = dirX * pr;
    const ok = tile(mx, my) && tile(mx + px, my + py) && tile(mx - px, my - py) && tile(fx, fy) && tile(fx + px, fy + py) && tile(fx - px, fy - py);
    _walkCache[key] = ok;
    return ok;
}

function isProjectileBlockedByWall(px, py, tx, ty) {
    const wc = getWallCache();
    if (!wc) return false;
    const w = getWallCacheW();
    const h = getWallCacheH();
    const tx0 = Math.floor(px / 300);
    const ty0 = Math.floor(py / 300);
    const tx1 = Math.floor(tx / 300);
    const ty1 = Math.floor(ty / 300);
    const dx = Math.abs(tx1 - tx0);
    const dy = -Math.abs(ty1 - ty0);
    const sx = tx0 < tx1 ? 1 : -1;
    const sy = ty0 < ty1 ? 1 : -1;
    let err = dx + dy;
    let cx = tx0, cy = ty0;
    let n = 60;
    while (n-- > 0) {
        if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
            try {
                const v = wc[cy * w + cx];
                if (v & 0x40) return true;
            } catch (_) { }
        }
        if (cx === tx1 && cy === ty1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
    }
    return false;
}

function timeToImpact(p, myX, myY, myRadius, movingDir, tMax) {
    if (p.losBlocked || p.ignored) return -1;
    const myVx = movingDir.x * CONFIG.CHAR_SPEED;
    const myVy = movingDir.y * CONFIG.CHAR_SPEED;
    const lag = CONFIG.LAG_COMPENSATION_S;
    const isMoving = (movingDir.x !== 0 || movingDir.y !== 0);
    const haz = p.impactRadius || p.radius;

    const r = myRadius + haz + CONFIG.SAFETY_MARGIN + (isMoving ? CONFIG.MOVING_EXTRA_MARGIN : 0);
    const px0 = p.x + p._svx * lag;
    const py0 = p.y + p._svy * lag;
    const dx = px0 - myX;
    const dy = py0 - myY;
    if (dx * dx + dy * dy <= r * r) return 0;
    const rvx = p._svx - myVx;
    const rvy = p._svy - myVy;
    const a = rvx * rvx + rvy * rvy;
    if (a < 1e-6) return -1;
    const b = 2 * (dx * rvx + dy * rvy);
    const c = dx * dx + dy * dy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    if (t2 < 0) return -1;
    const t = t1 >= 0 ? t1 : 0;
    if (t > tMax) return -1;
    return t;
}

function isUrgentThreat(p, myX, myY, myRadius, movingDir) {
    return timeToImpact(p, myX, myY, myRadius, movingDir, getUrgentWindow()) >= 0;
}

function getUrgentDodgeDir(myX, myY, myRadius, movingDir, intentDir) {
    const panicT = getClosestImpactTime(myX, myY, myRadius, movingDir, getUrgentWindow());
    let panicScale = 1.0;
    if (panicT >= 0 && panicT <= 0.12) panicScale = Math.max(0, panicT / 0.12);
    const sIntent = { x: intentDir.x * panicScale, y: intentDir.y * panicScale };
    const ix = sIntent.x * CONFIG.INTENT_WEIGHT;
    const iy = sIntent.y * CONFIG.INTENT_WEIGHT;
    let candidates = [];
    let urgentCount = 0;

    const burstGroups = new Map();
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        if (!isUrgentThreat(p, myX, myY, myRadius, movingDir)) continue;
        const key = p.ownerLocked
            ? (p.ownerBrawlerId + '_' + Math.floor(p.spawnTime / BURST_WINDOW_MS))
            : p.gid;
        let g = burstGroups.get(key);
        if (!g) { g = []; burstGroups.set(key, g); }
        g.push(p);
    }

    for (const group of burstGroups.values()) {
        urgentCount++;
        let avgDirX = 0, avgDirY = 0, avgX = 0, avgY = 0;
        for (const p of group) {
            avgDirX += p.dirX; avgDirY += p.dirY;
            avgX += p.x; avgY += p.y;
        }
        const cnt = group.length;
        avgDirX /= cnt; avgDirY /= cnt; avgX /= cnt; avgY /= cnt;
        const away = normalize(myX - avgX, myY - avgY);
        const perp1 = normalize(-avgDirY, avgDirX);
        const perp2 = normalize(avgDirY, -avgDirX);
        candidates.push(normalize(perp1.x * CONFIG.PERP_WEIGHT + away.x * CONFIG.AWAY_WEIGHT + ix, perp1.y * CONFIG.PERP_WEIGHT + away.y * CONFIG.AWAY_WEIGHT + iy));
        candidates.push(normalize(perp2.x * CONFIG.PERP_WEIGHT + away.x * CONFIG.AWAY_WEIGHT + ix, perp2.y * CONFIG.PERP_WEIGHT + away.y * CONFIG.AWAY_WEIGHT + iy));
    }

    if (urgentCount === 0) return null;
    candidates = candidates.concat(CACHED_DIRECTIONS);
    let bestDir = candidates[0];
    let bestScore = 1e18;
    for (let i = 0; i < candidates.length; i++) {
        const s = threatScore(candidates[i], myX, myY, myRadius, sIntent);
        if (s < bestScore) { bestScore = s; bestDir = candidates[i]; }
    }
    return { dir: bestDir };
}

function threatScore(dir, myX, myY, myRadius, intentDir) {
    let score = 0;
    let closestImpact = -1;
    if (!isDirectionWalkable(myX, myY, dir.x, dir.y, myRadius)) score += 1e12;
    const dirVx = dir.x * CONFIG.CHAR_SPEED;
    const dirVy = dir.y * CONFIG.CHAR_SPEED;
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        if (p.ignored) continue;
        const tImpact = timeToImpact(p, myX, myY, myRadius, dir, CONFIG.T_FIELD);
        if (tImpact >= 0) {
            if (closestImpact < 0 || tImpact < closestImpact) closestImpact = tImpact;
            score += 40000000 + ((CONFIG.T_FIELD - tImpact) * 40000000);
            if (tImpact <= 0.12) {
                const aw = normalize(myX - p.x, myY - p.y);
                const ha = dir.x * aw.x + dir.y * aw.y;
                const pw = 1 + ((0.12 - tImpact) / 0.12) * 4;
                score += (1 - ha) * pw * 2500000;
            }
        }
        const r = p._rNoMove;
        const vx = p._svx - dirVx;
        const vy = p._svy - dirVy;
        const dx = p._dx;
        const dy = p._dy;
        const a = vx * vx + vy * vy;
        const b = 2 * (dx * vx + dy * vy);
        const c = dx * dx + dy * dy;
        const rSq = r * r;
        if (a > 1e-6 && c > rSq) {
            const d2 = b * b - 4 * a * (c - rSq);
            if (d2 < 0) continue;
        }
        let minD2 = c;
        if (a > 1e-6) {
            const tMin = -b / (2 * a);
            if (tMin > 0 && tMin <= CONFIG.T_FIELD) minD2 = c + b * tMin + a * tMin * tMin;
            else if (tMin > CONFIG.T_FIELD) minD2 = c + b * CONFIG.T_FIELD + a * CONFIG.T_FIELD * CONFIG.T_FIELD;
        }
        let danger = 0;
        if (minD2 < rSq) {
            const pen = rSq - minD2;
            danger = 20000000 + (pen * 1000);
        } else {
            const cl = Math.sqrt(minD2) - r;
            if (cl < CONFIG.MIN_CLEARANCE) {
                const gap = CONFIG.MIN_CLEARANCE - cl;
                danger = (gap * gap * 500) / (CONFIG.MIN_CLEARANCE * CONFIG.MIN_CLEARANCE);
            }
            danger += (rSq * 200) / Math.max(minD2 - rSq, 1);
        }
        score += danger;
    }
    if (intentDir.x !== 0 || intentDir.y !== 0) {
        const dot = dir.x * intentDir.x + dir.y * intentDir.y;
        score -= dot * CONFIG.INTENT_WEIGHT * 30;
    }
    if (lastSafeDir && (Date.now() - lastSafeDirTime < 80)) {
        const di = dir.x * lastSafeDir.x + dir.y * lastSafeDir.y;
        const uw = getUrgentWindow();
        const f = closestImpact < 0 ? 1 : Math.max(0.15, Math.min(1, closestImpact / Math.max(uw, 0.01)));
        score -= di * 10 * f;
    }
    return score;
}

function chooseBestDirection(myX, myY, myRadius, intentDir) {
    const samples = CACHED_DIRECTIONS;
    let best = (intentDir.x !== 0 || intentDir.y !== 0) ? intentDir : samples[0];
    let bestScore = 1e18;
    let bestIdx = 0;
    const step = Math.max(1, (samples.length / CONFIG.N_COARSE_DIRECTIONS) | 0);
    for (let i = 0; i < samples.length; i += step) {
        const s = threatScore(samples[i], myX, myY, myRadius, intentDir);
        if (s < bestScore) { bestScore = s; best = samples[i]; bestIdx = i; }
    }
    for (let off = -2; off <= 2; off++) {
        const idx = (bestIdx + off + samples.length) % samples.length;
        const s2 = threatScore(samples[idx], myX, myY, myRadius, intentDir);
        if (s2 < bestScore) { bestScore = s2; best = samples[idx]; }
    }
    return { dir: best };
}

function isVelocityUnsafe(dir, myX, myY, myRadius) {
    if (!isDirectionWalkable(myX, myY, dir.x, dir.y, myRadius)) return true;
    const dirVx = dir.x * CONFIG.CHAR_SPEED;
    const dirVy = dir.y * CONFIG.CHAR_SPEED;
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        if (p.ignored) continue;
        const r = p._rNoMove;
        const vx = p._svx - dirVx;
        const vy = p._svy - dirVy;
        const dx = p._dx;
        const dy = p._dy;
        const a = vx * vx + vy * vy;
        const b = 2 * (dx * vx + dy * vy);
        const c = dx * dx + dy * dy - r * r;
        if (c < 0) return true;
        if (a > 1e-6) {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const t1 = (-b - Math.sqrt(disc)) / (2 * a);
                if (t1 > 0 && t1 <= CONFIG.T_FIELD) return true;
            }
        }
    }
    return false;
}

function applyVO(dir, myX, myY, myRadius, intentDir) {
    if (!isVelocityUnsafe(dir, myX, myY, myRadius)) return { dir: dir };
    const samples = CACHED_DIRECTIONS;
    let best = dir;
    let bestScore = 1e18;
    let foundSafe = false;
    for (let i = 0; i < samples.length; i++) {
        if (isVelocityUnsafe(samples[i], myX, myY, myRadius)) continue;
        foundSafe = true;
        const s = threatScore(samples[i], myX, myY, myRadius, intentDir);
        if (s < bestScore) { bestScore = s; best = samples[i]; }
    }
    if (!foundSafe) return { dir: dir };
    return { dir: best };
}

function getClosestImpactTime(myX, myY, myRadius, movingDir, tMax) {
    let bestT = -1;
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        const t = timeToImpact(p, myX, myY, myRadius, movingDir, tMax);
        if (t < 0) continue;
        if (bestT < 0 || t < bestT) bestT = t;
    }
    return bestT;
}

function shouldKeepCurrentUrgentDodge(curr, next, myX, myY, myRadius, intentDir) {
    if (!curr || !next) return false;
    if (!isDirectionWalkable(myX, myY, curr.x, curr.y, myRadius)) return false;
    const dot = directionDot(curr, next);
    if (dot > 0.25) return false;
    if (sameDirection(curr, next)) return false;
    const uw = getUrgentWindow();
    const cI = getClosestImpactTime(myX, myY, myRadius, curr, uw);
    const nI = getClosestImpactTime(myX, myY, myRadius, next, uw);
    if (cI >= 0 && cI <= 0.10) {
        if (nI < 0) return false;
        if (nI >= cI + 0.08) return false;
        return true;
    }
    const cs = threatScore(curr, myX, myY, myRadius, intentDir);
    const ns = threatScore(next, myX, myY, myRadius, intentDir);
    return cs <= ns * 1.15;
}

function checkDangerWithin(myX, myY, myRadius, movingDir, tMax) {
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        if (timeToImpact(p, myX, myY, myRadius, movingDir, tMax) >= 0) return true;
    }
    return false;
}

function checkDanger(myX, myY, myRadius, movingDir) {
    return checkDangerWithin(myX, myY, myRadius, movingDir, CONFIG.T_FIELD);
}

function checkReleaseDanger(myX, myY, myRadius, movingDir) {
    return checkDangerWithin(myX, myY, myRadius, movingDir, CONFIG.T_RELEASE);
}

function anyThreatLockedOn(myX, myY, myRadius) {
    const zero = { x: 0, y: 0 };
    const n = _activeProjs.length;
    for (let i = 0; i < n; i++) {
        const p = _activeProjs[i];
        if (timeToImpact(p, myX, myY, myRadius, zero, CONFIG.THREAT_LOCK_T) >= 0) return true;
    }
    return false;
}

function getDodgeMaxMs(myX, myY, myRadius) {
    const zero = { x: 0, y: 0 };
    const t = getClosestImpactTime(myX, myY, myRadius, zero, getUrgentWindow());
    if (t < 0) return CONFIG.DODGE_MAX_MS;
    const need = Math.ceil(t * 1000) + CONFIG.DODGE_BUFFER_MS;
    return Math.min(CONFIG.DODGE_MAX_MS, Math.max(CONFIG.DODGE_COMMIT_MS, need));
}

function canStopDodging(myX, myY, myRadius) {
    const zero = { x: 0, y: 0 };
    if (getClosestImpactTime(myX, myY, myRadius, zero, CONFIG.T_RELEASE) >= 0) return false;
    if (anyThreatLockedOn(myX, myY, myRadius)) return false;
    return true;
}

const IGNORED_BRAWLERS = new Set([
    'EL_PRIMO', 'MORTIS', 'ROSA', 'BIBI', 'JACKY', 'EDGAR', 'BUZZ',
    'FANG', 'SAM', 'HANK', 'DOUG', 'MICO', 'KIT', 'DRACO', 'LILY',
    'SAMURAI',
    'GLADIATOR',
    'BULL', 'DARRYL', 'FRANK', 'ASH',
    'BARLEY', 'DYNAMIKE', 'TICK', 'SPROUT', 'GROM', 'TWINS', 'WILLOW',
    'SQUEAK', 'JUJU', 'SHADOWDEMON',
    'POCO', 'EMZ',
    'SHADE', 'KAZE', 'ALLI', 'TRUNK', 'GIGI',
]);

function _isIgnoredProjectile(brawlerName, isBeam) {
    if (isBeam) return true;
    return brawlerName ? IGNORED_BRAWLERS.has(brawlerName) : false;
}

function resolveImpactRadius(radius, speed, ownerBrawlerId) {
    const aoe = ownerBrawlerId ? (BRAWLER_AOE_IMPACT_RADIUS[ownerBrawlerId] || 0) : 0;
    if (aoe > 0) return Math.max(radius, aoe);

    if (ownerBrawlerId) {
        const known = BRAWLER_PROJ_HITBOX[ownerBrawlerId];
        if (known !== undefined) return Math.max(radius, known);
    }

    if (speed > 0 && speed < 1200 && radius > 0 && radius < 120) return Math.min(220, radius * 2.25);
    return radius;
}

function inferProjectileOwner(x, y, enemies) {
    if (!enemies || enemies.length === 0) return null;
    let best = null;
    let bestD = PROJECTILE_OWNER_SNAP_DIST_SQ;
    for (const en of enemies) {
        const dx = x - en.x, dy = y - en.y, d2 = dx * dx + dy * dy;
        if (d2 > bestD) continue;
        bestD = d2;
        best = en;
    }
    return best ? { brawlerId: best.brawlerId, brawlerName: best.brawlerName || null } : null;
}

function syncProjectiles(now, scanProj, enemies) {
    const seen = {};
    for (const p of scanProj) {
        const gid = p.gid;
        seen[gid] = true;
        if (!projectiles[gid]) {
            const owner = inferProjectileOwner(p.x, p.y, enemies);

            let initDirX = 0, initDirY = 0, initUnconfirmed = true;
            if (p.spawnAngle !== null && p.spawnAngle !== undefined && isFinite(p.spawnAngle)) {
                initDirX = Math.cos(p.spawnAngle);
                initDirY = Math.sin(p.spawnAngle);
                initUnconfirmed = false;
            }

            const isBeam = !!p.isBeam;
            const ownerName = owner ? (owner.brawlerName || null) : null;
            projectiles[gid] = {
                x: p.x, y: p.y, dirX: initDirX, dirY: initDirY, speed: p.speed, radius: p.radius,
                impactRadius: resolveImpactRadius(p.radius, p.speed, owner ? owner.brawlerId : 0),
                lastX: p.x, lastY: p.y, lastSeen: now, unconfirmed: initUnconfirmed,
                ownerBrawlerId: owner ? owner.brawlerId : 0, ownerBrawlerName: ownerName,
                ownerLocked: owner !== null,
                spawnTime: now,
                ignored: _isIgnoredProjectile(ownerName, isBeam),
                losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
                losProjTileX: -9999, losProjTileY: -9999,
                _svx: 0, _svy: 0, _dx: 0, _dy: 0, _rNoMove: 0,
            };
        } else {
            const pr = projectiles[gid];
            const dx = p.x - pr.lastX, dy = p.y - pr.lastY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                pr.dirX = dx / dist;
                pr.dirY = dy / dist;
                pr.unconfirmed = false;
                if (!pr.ownerLocked) {
                    const owner = inferProjectileOwner(pr.x, pr.y, enemies);
                    if (owner) {
                        pr.ownerLocked = true;
                        pr.ownerBrawlerId = owner.brawlerId;
                        pr.ownerBrawlerName = owner.brawlerName || null;
                        pr.impactRadius = resolveImpactRadius(p.radius, p.speed, owner.brawlerId);
                        pr.ignored = _isIgnoredProjectile(pr.ownerBrawlerName, p.isBeam);
                    }
                }
            }
            pr.x = p.x; pr.y = p.y; pr.lastX = p.x; pr.lastY = p.y; pr.lastSeen = now;
        }
    }
    for (const pid of Object.keys(projectiles)) {
        if (seen[pid]) continue;
        if (now - projectiles[pid].lastSeen > CONFIG.STALE_MS) delete projectiles[pid];
    }
}

function buildActiveList(myX, myY, myRadius, tileX, tileY) {
    _activeProjs.length = 0;
    _maxProjSpeed = 0;
    const safetyR = myRadius + CONFIG.SAFETY_MARGIN;
    for (const k in projectiles) {
        const p = projectiles[k];
        const ptx = (p.x / 300) | 0;
        const pty = (p.y / 300) | 0;
        if (p.losMyTileX !== tileX || p.losMyTileY !== tileY || p.losProjTileX !== ptx || p.losProjTileY !== pty) {
            p.losBlocked = isProjectileBlockedByWall(p.x, p.y, myX, myY);
            p.losMyTileX = tileX;
            p.losMyTileY = tileY;
            p.losProjTileX = ptx;
            p.losProjTileY = pty;
        }
        if (p.unconfirmed) continue;
        p._svx = p.dirX * p.speed;
        p._svy = p.dirY * p.speed;
        p._dx = p.x - myX;
        p._dy = p.y - myY;
        p._rNoMove = safetyR + (p.impactRadius || p.radius);
        if (!p.ignored && p.speed > _maxProjSpeed) _maxProjSpeed = p.speed;
        _activeProjs.push(p);
    }
}

function updateAutododge() {
    if (!state.autododge) return;
    if (scanData.lastUpdate === 0) return;
    const now = Date.now();

    const myX = scanData.myX, myY = scanData.myY;
    const myRadius = scanData.myRadius || 60;

    const tileX = (myX / 300) | 0;
    const tileY = (myY / 300) | 0;
    if (tileX !== _walkCacheTileX || tileY !== _walkCacheTileY) {
        _walkCache = {};
        _walkCacheTileX = tileX;
        _walkCacheTileY = tileY;
    }

    CONFIG.CHAR_SPEED = scanData.mySpeed;
    syncProjectiles(now, scanData.projectiles, scanData.enemies);
    buildActiveList(myX, myY, myRadius, tileX, tileY);

    const intentDir = { x: 0, y: 0 };
    const userDir = { x: 0, y: 0 };
    const evalDir = _dodgeDir || userDir;
    const dodgeAge = g_dodgeStart > 0 ? now - g_dodgeStart : 0;
    const dodgeMaxMs = getDodgeMaxMs(myX, myY, myRadius);
    const dodgeTimedOut = dodgeAge >= dodgeMaxMs;
    const mustDodge = getClosestImpactTime(myX, myY, myRadius, evalDir, getUrgentWindow()) >= 0;

    if (_dodgeDir && now >= g_dodgeUntil && canStopDodging(myX, myY, myRadius)) {
        _dodgeDir = null;
        g_dodgeStart = 0;
        g_dodgeUntil = 0;
        return;
    }

    if (dodgeTimedOut && !mustDodge) {
        _dodgeDir = null;
        g_dodgeStart = 0;
        g_dodgeUntil = 0;
        return;
    }

    let heldDodgeDir = null;
    if (_dodgeDir && (mustDodge || now < g_dodgeUntil)) {
        if (isDirectionWalkable(myX, myY, _dodgeDir.x, _dodgeDir.y, myRadius) && !isVelocityUnsafe(_dodgeDir, myX, myY, myRadius)) {
            heldDodgeDir = _dodgeDir;
        }
    }
    const heldMovingDir = heldDodgeDir || evalDir;
    let safeDir = heldDodgeDir;
    const prevDir = _dodgeDir;
    if (!safeDir && mustDodge) {
        const urg = getUrgentDodgeDir(myX, myY, myRadius, heldMovingDir, intentDir);
        if (urg) {
            safeDir = applyVO(urg.dir, myX, myY, myRadius, intentDir).dir;
            if (shouldKeepCurrentUrgentDodge(prevDir, safeDir, myX, myY, myRadius, intentDir)) safeDir = prevDir;
        }
    }
    if (!safeDir) {
        _dodgeDir = null;
        g_dodgeStart = 0;
        g_dodgeUntil = 0;
        return;
    }
    lastSafeDir = safeDir;
    lastSafeDirTime = now;
    _dodgeDir = safeDir;
    if (!prevDir || !sameDirection(prevDir, safeDir)) {
        g_dodgeStart = now;
        g_dodgeUntil = now + CONFIG.DODGE_COMMIT_MS;
    }
}

function setupAutododge(base) {
    Interceptor.attach(base.add(offsets.BattleScreen__updateMovement), {
        onEnter: function (args) {
            let dir = null;
            if (state.autododge && _dodgeDir) {
                dir = _dodgeDir;
            }
            if (!dir) return;
            if (!isFinite(dir.x) || !isFinite(dir.y)) return;

            try {
                const self = args[0];
                if (!self || self.isNull()) return;
                const fns = getFunctions();
                const logic = fns.BattleScreen_getLogicBattleModeClient(self);
                if (!logic || logic.isNull()) return;

                const tx = Math.round(scanData.myX + dir.x * 500);
                const ty = Math.round(scanData.myY + dir.y * 500);
                if (!isFinite(tx) || !isFinite(ty)) return;
                if (Math.abs(tx) > 100000 || Math.abs(ty) > 100000) return;

                fns.LogicBattleModeClient_setClientPredictionMoveTo(logic, tx, ty, 1);

                const battle = fns.BattleMode_getInstance();
                if (!battle || battle.isNull()) return;
                const manager = battle.add(offsets.BattleMode_clientInputManager).readPointer();
                if (!manager || manager.isNull()) return;

                const lc = getLibc();
                const ci = lc.malloc(64);
                fns.ClientInput_constructor_int(ci, 2);
                ci.add(12).writeS32(tx);
                ci.add(16).writeS32(ty);
                fns.ClientInputManager_addInput(manager, ci);
            } catch (_) { }
        }
    });
}

const KA_CFG = {
    DEFAULT_RANGE:           2800,
    ERROR_COOLDOWN_MS:       2000,
    BATTLE_SCREEN_MAX_AGE_MS: 200,
    FIRE_EVERY_N_TICKS:      5,
};

let _errorUntil    = 0;
let _battleScreen  = null;
let _battleScreenTs = 0;
let _wrapperFn     = null;
let _tickCount     = 0;

function updateKillaura() {
    if (!state.killaura || !_battleScreen) return;
    const now = Date.now();
    if (now < _errorUntil) return;
    if (now - scanData.lastUpdate > 500) return;
    if (now - _battleScreenTs > KA_CFG.BATTLE_SCREEN_MAX_AGE_MS) return;

    _tickCount++;
    if (_tickCount < KA_CFG.FIRE_EVERY_N_TICKS) return;
    _tickCount = 0;

    try {
        const myX = scanData.myX, myY = scanData.myY;
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return;

        const range = (scanData.myBrawlerName && RANGE_BY_NAME[scanData.myBrawlerName])
            || BRAWLER_RANGE[scanData.myBrawlerId]
            || KA_CFG.DEFAULT_RANGE;
        const rangeSq = range * range;

        let bestDist = 1e18, bestX = 0, bestY = 0, bestGid = null, found = false;
        for (const e of (scanData.enemies || [])) {
            const dx = e.x - myX, dy = e.y - myY, d2 = dx * dx + dy * dy;
            if (d2 >= rangeSq || d2 >= bestDist) continue;
            if (!losCheck(myX, myY, e.x, e.y, 0x40)) continue;
            bestDist = d2; bestX = e.x; bestY = e.y; bestGid = e.gid; found = true;
        }

        if (!found) return;

        let fireX = bestX, fireY = bestY;
        const aim = computeAimForTarget(bestGid, myX, myY);
        if (aim) { fireX = aim.x; fireY = aim.y; }

        _battleScreen.add(0xf04).writeS32(fireX);
        _battleScreen.add(0xf08).writeS32(fireY);
        _battleScreen.add(0xe6c).writeS32(fireX);
        _battleScreen.add(0xe70).writeS32(fireY);
        _battleScreen.add(0x66c).writeS32(0);
        _wrapperFn(_battleScreen, own);
    } catch (_) {
        _errorUntil = Date.now() + KA_CFG.ERROR_COOLDOWN_MS;
        _tickCount = 0;
    }
}

function setupKillaura(base) {
    _wrapperFn = new NativeFunction(base.add(offsets.Killaura_nativeFire), 'int', ['pointer', 'pointer']);
}


class RGBA {
    static color(r, g, b, a = 255) {
        const alpha = Math.round(a) << 24;
        const red = r << 16;
        const green = g << 8;
        const blue = b;

        const hexNumber = alpha | red | green | blue;
        return hexNumber >>> 0;
    }

    static hex(hexNumber) {
        const alpha = (hexNumber >> 24) & 255;
        const red = (hexNumber >> 16) & 255;
        const green = (hexNumber >> 8) & 255;
        const blue = hexNumber & 255;

        return { r: red, g: green, b: blue, a: alpha };
    }
}

RGBA.red = RGBA.color(255, 0, 0);
RGBA.green = RGBA.color(0, 255, 0);
RGBA.blue = RGBA.color(0, 0, 255);
RGBA.yellow = RGBA.color(255, 255, 0);
RGBA.purple = RGBA.color(255, 0, 255);
RGBA.cyan = RGBA.color(0, 255, 255);
RGBA.black = RGBA.color(0, 0, 0);
RGBA.white = RGBA.color(255, 255, 255);

let dodgeBtn = null;
let aimbotBtn = null;
let killauraBtn = null;
let dodgeTextField = null;
let aimbotTextField = null;
let killauraTextField = null;

let capturedParent = null;
let capturedAddChildAddr = null;
let buttonsCreated = false;

function setCapturedAddChildAddr(addr) {
    capturedAddChildAddr = addr;
}

function createStringObject(str) {
    const functions = getFunctions();
    const libc = getLibc();
    const raw = Memory.allocUtf8String(str);
    const obj = libc.malloc(128);
    functions.StringCtor(obj, raw);
    return obj;
}

function createButton(text, x, y, parent, addChildFn, frame) {
    const functions = getFunctions();
    const libc = getLibc();

    const s1 = Memory.allocUtf8String("sc/ui.sc");
    const s2 = Memory.allocUtf8String("map_editor_exit_button");

    const mc = functions.StringTable_getMovieClip(s1, s2, 1);
    if (!mc || mc.isNull()) {
        return null;
    }

    const btn = libc.malloc(600);
    for (let i = 0; i < 600; i += 8) btn.add(i).writeU64(0);

    functions.GameButtonCtor(btn);
    functions.CustomButton_SetMovieClip(btn, mc, 1);
    functions.MovieClip_gotoAndStopFrameIndex(mc, frame);
    functions.DisplayObject_setXY(btn, x, y);
    functions.TextField_setText_ui(btn, createStringObject(text), 1);

    const textField = functions.MovieClip_getTextFieldByName(mc, Memory.allocUtf8String("txt"));

    addChildFn(parent, btn);

    return { btn, textField };
}

function setButtonText(btn, text) {
    const functions = getFunctions();
    functions.TextField_setText_ui(btn, createStringObject(text), 1);
}

function setButtonTextColor(textField, color) {
    textField.add(96).writeInt(color);
}

function createAllButtons() {
    if (buttonsCreated) return;
    if (!capturedParent || capturedParent.isNull()) return;
    if (!capturedAddChildAddr) return;

    try {
        if (!capturedParent || capturedParent.isNull()) return;
        if (!capturedAddChildAddr) return;

        const addChild = new NativeFunction(capturedAddChildAddr, "pointer", ["pointer", "pointer"]);

        try {
            const result = createButton(
                "Killaura",
                500, 100, capturedParent, addChild, 1
            );
            killauraBtn = result.btn;
            killauraTextField = result.textField;
            setButtonTextColor(killauraTextField, state.killaura ? RGBA.green : RGBA.red);
        } catch (e) {
            killauraBtn = null;
        }

        try {
            const result = createButton(
                "Aimbot",
                575, 100, capturedParent, addChild, 1
            );
            aimbotBtn = result.btn;
            aimbotTextField = result.textField;
            setButtonTextColor(aimbotTextField, state.aimbot ? RGBA.green : RGBA.red);
        } catch (e) {
            aimbotBtn = null;
        }

        try {
            const result = createButton(
                "Autododge",
                650, 100, capturedParent, addChild, 1
            );
            dodgeBtn = result.btn;
            dodgeTextField = result.textField;
            setButtonTextColor(dodgeTextField, state.autododge ? RGBA.green : RGBA.red);
        } catch (e) {
            dodgeBtn = null;
        }

        buttonsCreated = true;
    } catch (e) {
        buttonsCreated = false;
    }
}

function setupUI(base) {
    Interceptor.attach(base.add(offsets.Sprite_addChild), {
        onEnter(args) {
            if (!capturedParent) {
                capturedParent = args[0];
                setCapturedAddChildAddr(base.add(offsets.Sprite_addChild));

                createAllButtons();
            }
        },
    });

    Interceptor.attach(base.add(offsets.ButtonCallback), {
        onEnter(args) {
            try {
                const clicked = args[0];
                if (!clicked || clicked.isNull()) return;

                const clickedAddr = clicked.toInt32();

                if (killauraBtn && !killauraBtn.isNull() && clickedAddr === killauraBtn.toInt32()) {
                    state.killaura = !state.killaura;
                    setButtonTextColor(killauraTextField, state.killaura ? RGBA.green : RGBA.red);
                }
                if (aimbotBtn && !aimbotBtn.isNull() && clickedAddr === aimbotBtn.toInt32()) {
                    state.aimbot = !state.aimbot;
                    setButtonTextColor(aimbotTextField, state.aimbot ? RGBA.green : RGBA.red);
                }
                if (dodgeBtn && !dodgeBtn.isNull() && clickedAddr === dodgeBtn.toInt32()) {
                    state.autododge = !state.autododge;
                    setButtonTextColor(dodgeTextField, state.autododge ? RGBA.green : RGBA.red);
                }
            } catch (e) {}
        },
    });

    Interceptor.attach(base.add(offsets.BattleMode_enter), {
        onEnter() {
            capturedParent = null;
            capturedAddChildAddr = null;
            killauraBtn = null;
            aimbotBtn = null;
            dodgeBtn = null;
            killauraTextField = null;
            aimbotTextField = null;
            dodgeTextField = null;
            buttonsCreated = false;
        },
    });
}


function startAgent() {
  libg().then((base) => {
    initFunctions(base);
    initScanner(base);

    return libc().then((c) => {
      initUtils(c);
      initWallCache(base);
      setupUI(base);
      setupAimbot(base);
      setupAutododge(base);
      setupKillaura(base);

      let lastTickTime = 0;
      let lastBM = null;

      Interceptor.attach(base.add(offsets.LogicBattleModeClient_update), {
        onEnter: function (args) {
          const bm = args[0];
          if (!bm || bm.isNull()) return;

          if (!lastBM || !lastBM.equals(bm)) {
            lastBM = bm;
            resetAimbot();
            resetAutododge();
            resetScannerCache();
            profileManager.clearAll();
            sharedState.ownCarryingBall = false;
          }

          const now = Date.now();
          if (now - lastTickTime < 16) return;
          lastTickTime = now;

          if (!(state.aimbot || state.killaura || state.autododge)) return;

          updateScanner(bm);
          if (state.aimbot || state.killaura) updateAimbot();
          if (state.killaura) updateKillaura();
          if (state.autododge) updateAutododge();
        }
      });

    });
  }).catch(() => {});
}

startAgent();