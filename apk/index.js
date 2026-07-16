'use strict';

const state = { aimbot: false, autododge: false, killaura: false, esp: false, name: true, camera: false, spray: false, pin: false, spinner: false, brawltv: false, spec: false };

let _utilsLibc = null;
function initUtils(libc) { _utilsLibc = libc; }
function getLibc() {
  if (!_utilsLibc) throw new Error('libc not initialized');
  return _utilsLibc;
}

const OFFSETS = {
    LogicBattleModeClient_update:                    0xB8EEE0,
    BattleMode_getInstance:                          0x954EE0,
    LogicGameObjectClient_getX:                      0xAE4A1C,
    LogicGameObjectClient_getY:                      0xAE4A24,
    LogicBattleModeClient_getOwnCharacter:           0xB90A28,
    BattleScreen_activateSkill:                      0x80274C,
    StringCtor:                                      0xDCF8F0,
    LogicBattleModeClient_getOwnPlayerTeam:          0xB90680,
    LogicGameObjectClient_getGlobalID:               0xAE49C8,
    LogicGameObjectClient_getData:                   0xAE46FC,
    LogicProjectileData_getRadius:                   0xA8164C,
    LogicProjectileData_getSpeed:                    0xA815CC,
    LogicCharacterData_getCollisionRadius:           0xA3B52C,
    ClientInput_constructor_int:                     0xB53A68,
    ClientInputManager_addInput:                     0x79BF3C,
    LogicBattleModeClient_setClientPredictionMoveTo: 0xB90B8C,
    LogicTileMap_getTile:                            0x9DC190,

    VTABLE_PROJECTILE_DATA:                          0x11501B0,

    TileMap_Width:                                   0xC4,
    TileMap_Height:                                  0xC8,
    TileMap_TilesArray:                              0x20,
    TileTypeData_BlocksMovement:                     0x56,

    BattleMode_objectManagerPtr:                     0x28,
    BattleMode_clientInputManager:                   0x58,

    ObjectManager_objectsArray:                      0x00,
    ObjectManager_count:                             0x0C,
    ObjectManager_ptrStride:                         8,

    GameObj_team:                                    0x40,
    GameObj_deadFlag:                                0xD0,

    CharData_speed:                                  0x1C4,
    CharData_brawlerId:                              0x18,

    Projectile_spawnAngle:                           0xB8,

    ScString_length:                                 0x04,
    ScString_data:                                   0x08,

    TextField_setText:                               0xC4A978,
    MovieClip_getTextFieldByName:                    0xC1D7B0,
    BattleMode_enter:                                0x956664,
    ButtonCallback:                                  0xC4DFCC,
    Sprite_addChild:                                 0xC2D8C4,
    TextField_setText_ui:                            0x598298,
    DisplayObject_setXY:                             0xC16B4C,
    MovieClip_gotoAndStopFrameIndex:                 0xC1C90C,
    CustomButton_SetMovieClip:                       0xC4E18C,
    GameButtonCtor:                                  0x597C48,
    MessageManager__receiveMessage:                  0x7BAD14,
    BattleScreen__updateAutoshoot:                   0x8076A0,
    BattleScreen__updateMovement:                    0x809348,
    GameScreen__getLogicBattle:                      0x818BCC,
    MovieClipHelper__setTextAndScaleIfNecessary:     0x990CA8,
    LogicProjectileData__isBeam:                     0xA81770,
    StringTable_getMovieClip:                        0xBECE60,

    BattleScreen__updateCameraParameters:            0x7FEDC8,
    BattleScreen__update:                            0x56FA80,
    BattleScreen_spectateWidget:                     0x3C8,
    BattleScreen_spectateTextField:                  0x3D8,
    BattleScreen_screenWidth:                        0x884,
    BattleScreen_screenHeight:                       0x888,
    BattleScreen_viewMatrix:                         0x7E8,

    Message_port:                                    0x90,
    Message_ipPtr:                                   0x98,

    CAM_MODE_OFFSET:                                 0x8AC,
    Killaura_nativeFire:                             0x802960,
};

const offsets = OFFSETS;

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
            ClientInput_constructor_int:
                new NativeFunction(base.add(offsets.ClientInput_constructor_int), 'pointer', ['pointer','int']),
            ClientInputManager_addInput:
                new NativeFunction(base.add(offsets.ClientInputManager_addInput), 'void', ['pointer','pointer']),
            StringCtor:
                new NativeFunction(base.add(offsets.StringCtor), 'pointer', ['pointer','pointer']),
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
            TextField_setText:
                new NativeFunction(base.add(offsets.TextField_setText), "pointer", ["pointer", "pointer"]),
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
    constructor() {
        this.samples = 0;
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

        const alpha = Math.min(0.15, 5 / (this.samples + 5));
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
}

class ProfileManager {
    constructor() {
        this.profiles = new Map();
    }

    getProfile(targetId) {
        if (!this.profiles.has(targetId)) {
            this.profiles.set(targetId, new PlayerProfile());
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

const SPREAD_BRAWLER_IDS = new Set([0, 2, 4, 12, 13, 16, 17, 18, 28, 30, 35, 36, 50, 63]);

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
                } else if (SPREAD_BRAWLER_IDS.has(myBrawlerId)) {
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
    HITBOX_SCALE: 1.08,
    T_URGENT_MIN: 0.45,
    T_URGENT_MAX: 0.70,
    DODGE_COMMIT_MS: 70,
    N_DIRECTIONS: 16,
    MAX_DIST_SQ: 5000 * 5000,
    STALE_MS: 300,
    MOMENTUM_BONUS: 80,
    ACTIVATION_LEAD_S: 0.60,
    RELEASE_GRACE_MS: 120,
    CHAR_SPEED: 720,
    LAG_COMPENSATION_S: 0.030,
    DODGE_EXIT_CLEARANCE: 30,
    TIME_TIEBREAK_WEIGHT: 60,
    COMMIT_KEEP_BAND: 25,
    DESPERATE_KEEP_BAND: 40,
    LOCK_DRIFT_MAX: 220,
    URGENT_WINDOW_CACHE_MS: 250,
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
let projectiles = {};
let g_dodgeUntil = 0;
let _dodgeDir = null;
let _lockOriginX = 0;
let _lockOriginY = 0;
let _lastThreatTs = 0;

let _walkCache = {};
let _walkCacheTileX = -9999;
let _walkCacheTileY = -9999;
let _cachedUrgentWindow = 0.9;
let _cachedUrgentWindowTs = 0;

const _activeProjs = [];
let _maxProjSpeed = 0;
let _hasMassiveThreat = false;

const _PROJ_PAST_THRESHOLD = -200;
const _PERP_SKIP_MULT = 2.5;
const _MAX_TTH_BASE_S = 1.0;
const _MAX_TTH_SPEED_S = 0.000125;
const _MASSIVE_RADIUS = 380;
const _ANTI_SUICIDE_WEIGHT = 200000;
const _ANTI_SUICIDE_THRESHOLD = 0.05;
const _SIDESTEP_SNIPER_SPEED = 3500;
const _SIDESTEP_WEIGHT = 1000;
const _WALL_BUFFER = 180;
const _WALL_BUFFER_LOOKAHEAD = 500;
const _SNIPER_LOCK_BONUS_MS = 60;

function _computeUrgencyTier(timeToHit, rawDist, perpDist, hitRadius) {
    let u = 1 / (timeToHit + 0.002);
    if (perpDist < hitRadius)             u *= 20;
    else if (perpDist < hitRadius * 1.15) u *= 8;
    else                                  u *= 2.5;
    if (rawDist < 250)       u *= 30;
    else if (rawDist < 600)  u *= 12;
    else if (rawDist < 1200) u *= 5;
    return u;
}

function _tileBlocking(wx, wy) {
    const wc = getWallCache();
    if (!wc) return false;
    const w = getWallCacheW();
    const h = getWallCacheH();
    const tx = (wx / 300) | 0;
    const ty = (wy / 300) | 0;
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
    return (wc[ty * w + tx] & 0x80) !== 0;
}

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
    _lockOriginX = 0;
    _lockOriginY = 0;
    _lastThreatTs = 0;
    _walkCache = {};
    _walkCacheTileX = -9999;
    _walkCacheTileY = -9999;
    _cachedUrgentWindowTs = 0;
}

function getUrgentWindow() {
    const now = Date.now();
    if (now - _cachedUrgentWindowTs < CONFIG.URGENT_WINDOW_CACHE_MS) return _cachedUrgentWindow;
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
    if (tx0 === tx1 && ty0 === ty1) return false;
    const dx = Math.abs(tx1 - tx0);
    const dy = -Math.abs(ty1 - ty0);
    const sx = tx0 < tx1 ? 1 : -1;
    const sy = ty0 < ty1 ? 1 : -1;
    let err = dx + dy;
    let cx = tx0, cy = ty0;
    const maxSteps = dx + (-dy) + 2;
    for (let n = 0; n < maxSteps; n++) {
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return false;
        try {
            const v = wc[cy * w + cx];
            if (v & 0x40) return true;
        } catch (_) { }
        if (cx === tx1 && cy === ty1) return false;
    }
    return false;
}

function _scoreFor(p, mvx, mvy, mDirX, mDirY, myX, myY, myRadius, horizon) {
    if (p.losBlocked || p.ignored) return { score: Infinity, clearance: Infinity, ttc: Infinity };
    const haz = p.impactRadius || p.radius;
    const r = (myRadius + haz) * CONFIG.HITBOX_SCALE + CONFIG.SAFETY_MARGIN;
    const lag = CONFIG.LAG_COMPENSATION_S;
    const psvx = p.dirX * p.speed;
    const psvy = p.dirY * p.speed;
    const px0 = p.x + psvx * lag;
    const py0 = p.y + psvy * lag;
    const dx = px0 - myX;
    const dy = py0 - myY;
    const rvx = psvx - mvx;
    const rvy = psvy - mvy;
    const a = rvx * rvx + rvy * rvy;
    let tStar;
    if (a < 1e-6) tStar = 0;
    else {
        tStar = -(dx * rvx + dy * rvy) / a;
        if (tStar < 0) tStar = 0;
        else if (tStar > horizon) tStar = horizon;
    }
    const dxT = dx + rvx * tStar;
    const dyT = dy + rvy * tStar;
    const distMin = Math.sqrt(dxT * dxT + dyT * dyT);
    const clearance = distMin - r;
    const tEff = clearance >= 0 ? horizon : tStar;

    let bonus = 0;
    if (mDirX !== 0 || mDirY !== 0) {
        const urgency = p._urgency || (1 / (tStar + 0.05));
        const toProjX = p.x - myX;
        const toProjY = p.y - myY;
        const tpLenSq = toProjX * toProjX + toProjY * toProjY;
        if (tpLenSq > 1) {
            const invLen = 1 / Math.sqrt(tpLenSq);
            const dotTowards = mDirX * toProjX * invLen + mDirY * toProjY * invLen;
            if (dotTowards > _ANTI_SUICIDE_THRESHOLD) {
                bonus -= _ANTI_SUICIDE_WEIGHT * dotTowards * urgency;
            }
        }
        if (p.speed > _SIDESTEP_SNIPER_SPEED) {
            const perpDot = Math.abs(mDirX * (-p.dirY) + mDirY * p.dirX);
            bonus += _SIDESTEP_WEIGHT * perpDot * urgency;
        }
    }

    const score = clearance + CONFIG.TIME_TIEBREAK_WEIGHT * tEff + bonus;
    return { score: score, clearance: clearance, ttc: tStar };
}

function _minScore(dirX, dirY, charSpeed, myX, myY, myRadius, horizon) {
    const projs = _activeProjs;
    const n = projs.length;
    if (n === 0) return { score: Infinity, clearance: Infinity, ttc: Infinity };
    const mvx = dirX * charSpeed;
    const mvy = dirY * charSpeed;
    let minScore = Infinity;
    let minC = Infinity;
    let minT = Infinity;
    for (let i = 0; i < n; i++) {
        const r = _scoreFor(projs[i], mvx, mvy, dirX, dirY, myX, myY, myRadius, horizon);
        if (r.score < minScore) minScore = r.score;
        if (r.clearance < minC) minC = r.clearance;
        if (r.ttc < minT) minT = r.ttc;
    }
    return { score: minScore, clearance: minC, ttc: minT };
}

function _evalDir(dx, dy, charSpeed, myX, myY, myRadius, horizon, prevDir) {
    if (!isDirectionWalkable(myX, myY, dx, dy, myRadius)) return null;
    const m = _minScore(dx, dy, charSpeed, myX, myY, myRadius, horizon);
    let s = m.score;
    if (prevDir) s += (dx * prevDir.x + dy * prevDir.y) * CONFIG.MOMENTUM_BONUS;
    const wc = getWallCache();
    if (wc) {
        const endX = myX + dx * _WALL_BUFFER_LOOKAHEAD;
        const endY = myY + dy * _WALL_BUFFER_LOOKAHEAD;
        if (_tileBlocking(endX + _WALL_BUFFER, endY) ||
            _tileBlocking(endX - _WALL_BUFFER, endY) ||
            _tileBlocking(endX, endY + _WALL_BUFFER) ||
            _tileBlocking(endX, endY - _WALL_BUFFER)) {
            s -= 500000;
        }
    }
    return { score: s, clearance: m.clearance, ttc: m.ttc };
}

function _pickBestDir(myX, myY, myRadius, charSpeed, prevDir) {
    const horizon = getUrgentWindow();
    const stay = _minScore(0, 0, charSpeed, myX, myY, myRadius, horizon);
    let bestScore = stay.score;
    let bestCl = stay.clearance;
    let bestTtc = stay.ttc;
    let bestDir = null;
    let bestAng = 0;
    const samples = CACHED_DIRECTIONS;
    for (let i = 0; i < samples.length; i++) {
        const d = samples[i];
        const e = _evalDir(d.x, d.y, charSpeed, myX, myY, myRadius, horizon, prevDir);
        if (!e) continue;
        if (e.score > bestScore) {
            bestScore = e.score;
            bestCl = e.clearance;
            bestTtc = e.ttc;
            bestDir = d;
            bestAng = Math.atan2(d.y, d.x);
        }
    }
    if (bestDir) {
        let step = Math.PI / samples.length;
        for (let lvl = 0; lvl < 2; lvl++) {
            for (let k = -1; k <= 1; k += 2) {
                const ang = bestAng + k * step;
                const dx = Math.cos(ang);
                const dy = Math.sin(ang);
                const e = _evalDir(dx, dy, charSpeed, myX, myY, myRadius, horizon, prevDir);
                if (!e) continue;
                if (e.score > bestScore) {
                    bestScore = e.score;
                    bestCl = e.clearance;
                    bestTtc = e.ttc;
                    bestDir = { x: dx, y: dy };
                    bestAng = ang;
                }
            }
            step *= 0.5;
        }
    }
    return {
        dir: bestDir,
        score: bestScore,
        clearance: bestCl,
        ttc: bestTtc,
        stayClearance: stay.clearance,
        stayTtc: stay.ttc,
        horizon: horizon,
    };
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
    return best ? { brawlerId: best.brawlerId, brawlerName: best.brawlerName || null, x: best.x, y: best.y } : null;
}

function syncProjectiles(now, scanProj, enemies) {
    const seen = {};
    for (const p of scanProj) {
        const gid = p.gid;
        seen[gid] = true;
        if (!projectiles[gid]) {
            const owner = inferProjectileOwner(p.x, p.y, enemies);

            let initDirX = 0, initDirY = 0, initUnconfirmed = true;
            if (p.spawnAngle !== null && p.spawnAngle !== undefined && isFinite(p.spawnAngle) && p.spawnAngle !== 0.0) {
                initDirX = Math.cos(p.spawnAngle);
                initDirY = Math.sin(p.spawnAngle);
                initUnconfirmed = false;
            }
            if (initUnconfirmed && owner) {
                const ddx = p.x - owner.x;
                const ddy = p.y - owner.y;
                const len = Math.sqrt(ddx * ddx + ddy * ddy);
                if (len > 1) {
                    initDirX = ddx / len;
                    initDirY = ddy / len;
                    initUnconfirmed = false;
                }
            }

            const isBeam = !!p.isBeam;
            const ownerName = owner ? (owner.brawlerName || null) : null;
            projectiles[gid] = {
                x: p.x, y: p.y, dirX: initDirX, dirY: initDirY, speed: p.speed, radius: p.radius,
                impactRadius: resolveImpactRadius(p.radius, p.speed, owner ? owner.brawlerId : 0),
                lastX: p.x, lastY: p.y, lastSeen: now, unconfirmed: initUnconfirmed,
                ownerBrawlerId: owner ? owner.brawlerId : 0, ownerBrawlerName: ownerName,
                ownerLocked: owner !== null,
                ignored: _isIgnoredProjectile(ownerName, isBeam),
                losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
                losProjTileX: -9999, losProjTileY: -9999,
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
    _hasMassiveThreat = false;
    const leadS = CONFIG.ACTIVATION_LEAD_S;
    const maxDistSq = CONFIG.MAX_DIST_SQ;
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
        const ddx = p.x - myX;
        const ddy = p.y - myY;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 > maxDistSq) continue;
        const eff = p.speed * leadS;
        if (d2 > eff * eff) continue;

        const haz = p.impactRadius || p.radius;
        const isSlow = (p.speed <= 800);
        p._urgency = 0;

        if (!p.ignored && !p.losBlocked && !isSlow) {
            if (_tileBlocking(p.x, p.y)) continue;
            const dxToMe = myX - p.x;
            const dyToMe = myY - p.y;
            const dotToPlayer = dxToMe * p.dirX + dyToMe * p.dirY;
            if (dotToPlayer < _PROJ_PAST_THRESHOLD) continue;
            const projection = dotToPlayer < 0 ? 0 : (dotToPlayer > 8000 ? 8000 : dotToPlayer);
            const closestX = p.x + p.dirX * projection;
            const closestY = p.y + p.dirY * projection;
            const dclX = myX - closestX;
            const dclY = myY - closestY;
            const perpDist = Math.sqrt(dclX * dclX + dclY * dclY);
            const dynamicBuffer = haz * (1.1 + p.speed * 0.0002);
            if (perpDist > dynamicBuffer * _PERP_SKIP_MULT) continue;
            const rawDist = Math.sqrt(d2);
            const timeToHit = rawDist / (p.speed < 1 ? 1 : p.speed);
            if (timeToHit > _MAX_TTH_BASE_S + p.speed * _MAX_TTH_SPEED_S) continue;
            p._urgency = _computeUrgencyTier(timeToHit, rawDist, perpDist, haz);
            if (haz > _MASSIVE_RADIUS) _hasMassiveThreat = true;
        }

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

    if (_hasMassiveThreat) {
        _dodgeDir = null;
        g_dodgeUntil = 0;
        return;
    }

    const charSpeed = CONFIG.CHAR_SPEED || 720;
    const prevDir = _dodgeDir;

    const picked = _pickBestDir(myX, myY, myRadius, charSpeed, prevDir);
    const stayCl = picked.stayClearance;
    const bestCl = picked.clearance;
    const mustDodge = prevDir !== null ? (stayCl < CONFIG.DODGE_EXIT_CLEARANCE) : (stayCl < 0);

    if (!mustDodge) {
        if (prevDir && (now - _lastThreatTs) < CONFIG.RELEASE_GRACE_MS
            && isDirectionWalkable(myX, myY, prevDir.x, prevDir.y, myRadius)) {
            _dodgeDir = prevDir;
            return;
        }
        _dodgeDir = null;
        g_dodgeUntil = 0;
        return;
    }

    _lastThreatTs = now;

    if (!picked.dir) {
        _dodgeDir = null;
        g_dodgeUntil = 0;
        return;
    }

    let safeDir = picked.dir;
    const desperate = bestCl < 0;

    if (prevDir && isDirectionWalkable(myX, myY, prevDir.x, prevDir.y, myRadius)) {
        const prevM = _minScore(prevDir.x, prevDir.y, charSpeed, myX, myY, myRadius, picked.horizon);
        if (prevM.clearance >= 0) {
            safeDir = prevDir;
        } else if (desperate) {
            if (prevM.clearance >= bestCl - CONFIG.DESPERATE_KEEP_BAND) safeDir = prevDir;
        } else if (now < g_dodgeUntil && prevM.clearance >= bestCl - CONFIG.COMMIT_KEEP_BAND) {
            safeDir = prevDir;
        }
    }

    if (prevDir && now < g_dodgeUntil) {
        const ddx = myX - _lockOriginX;
        const ddy = myY - _lockOriginY;
        const dmax = CONFIG.LOCK_DRIFT_MAX;
        if (ddx * ddx + ddy * ddy > dmax * dmax) g_dodgeUntil = now;
    }

    let urgentSniper = false;
    for (let i = 0; i < _activeProjs.length; i++) {
        const ap = _activeProjs[i];
        if (ap.losBlocked || ap.ignored) continue;
        if (ap.speed > _SIDESTEP_SNIPER_SPEED && (ap._urgency || 0) > 0) { urgentSniper = true; break; }
    }

    const dirChanged = !sameDirection(prevDir, safeDir);
    _dodgeDir = safeDir;
    if (dirChanged) {
        g_dodgeUntil = now + CONFIG.DODGE_COMMIT_MS + (urgentSniper ? _SNIPER_LOCK_BONUS_MS : 0);
        _lockOriginX = myX;
        _lockOriginY = myY;
    }
}

const SPIN_RADIUS = 25;
const SPIN_STEP = Math.PI / 4;
let _spinPhase = 0;

function setupAutododge(base) {
    Interceptor.attach(base.add(offsets.BattleScreen__updateMovement), {
        onEnter: function (args) {
            let tx, ty;
            let active = false;

            if (state.autododge && _dodgeDir) {
                const dir = _dodgeDir;
                if (!isFinite(dir.x) || !isFinite(dir.y)) return;
                tx = Math.round(scanData.myX + dir.x * 500);
                ty = Math.round(scanData.myY + dir.y * 500);
                active = true;
            } else if (state.spinner) {
                _spinPhase += SPIN_STEP;
                if (_spinPhase >= Math.PI * 2) _spinPhase -= Math.PI * 2;
                tx = Math.round(scanData.myX + Math.cos(_spinPhase) * SPIN_RADIUS);
                ty = Math.round(scanData.myY + Math.sin(_spinPhase) * SPIN_RADIUS);
                active = true;
            }

            if (!active) return;
            if (!isFinite(tx) || !isFinite(ty)) return;
            if (Math.abs(tx) > 100000 || Math.abs(ty) > 100000) return;

            try {
                const self = args[0];
                if (!self || self.isNull()) return;
                const fns = getFunctions();
                const logic = fns.BattleScreen_getLogicBattleModeClient(self);
                if (!logic || logic.isNull()) return;

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
}

RGBA.red = RGBA.color(255, 0, 0);
RGBA.green = RGBA.color(0, 255, 0);
RGBA.yellow = RGBA.color(255, 255, 0);
RGBA.white = RGBA.color(255, 255, 255);

let dodgeBtn = null;
let aimbotBtn = null;
let killauraBtn = null;
let dodgeTextField = null;
let aimbotTextField = null;
let killauraTextField = null;
let espBtn = null;
let cameraBtn = null;
let sprayBtn = null;
let pinBtn = null;
let spinnerBtn = null;
let espTextField = null;
let cameraTextField = null;
let sprayTextField = null;
let pinTextField = null;
let spinnerTextField = null;
let brawltvBtn = null;
let specBtn = null;
let brawltvTextField = null;
let specTextField = null;
let menuBtn = null;
let menuTextField = null;
let menuOpen = false;
let revengeLabelMc = null;
let revengeLabelTextField = null;

const MENU_X = 613;
const MENU_Y = 80;
const REVENGE_LABEL_X = 566;
const REVENGE_LABEL_Y = 105;
const FEAT_COL_X = [500, 575, 650, 725];
const FEAT_ROW1_Y = 170;
const FEAT_ROW2_Y = 245;
const FEAT_ROW3_Y = 320;
const HIDE_X = -3000;
const HIDE_Y = -3000;

let capturedParent = null;
let capturedAddChildAddr = null;
let buttonsCreated = false;

function createStringObject(str) {
    const functions = getFunctions();
    const libc = getLibc();
    const raw = Memory.allocUtf8String(str);
    const obj = libc.malloc(128);
    functions.StringCtor(obj, raw);
    return obj;
}

function createTextLabel(text, x, y, parent, addChildFn, fontSize = 30, color = null) {
    const functions = getFunctions();
    const s1 = Memory.allocUtf8String("sc/debug.sc");
    const s2 = Memory.allocUtf8String("debug_menu_text");
    const mc = functions.StringTable_getMovieClip(s1, s2, 1);
    if (!mc || mc.isNull()) return null;

    const textField = functions.MovieClip_getTextFieldByName(mc, Memory.allocUtf8String("Text"));
    if (!textField || textField.isNull()) return null;

    textField.add(144).writeInt(fontSize);
    textField.add(96).writeInt(color != null ? color : RGBA.white);
    functions.TextField_setText(textField, createStringObject(text));

    functions.DisplayObject_setXY(mc, x, y);
    addChildFn(parent, mc);
    return { mc, textField };
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

function setButtonTextColor(textField, color) {
    textField.add(96).writeInt(color);
}

function _setBtnPos(btn, x, y) {
    if (!btn || btn.isNull()) return;
    try { getFunctions().DisplayObject_setXY(btn, x, y); } catch (_) {}
}

function applyMenuVisibility() {
    const r1y = menuOpen ? FEAT_ROW1_Y : HIDE_Y;
    const r2y = menuOpen ? FEAT_ROW2_Y : HIDE_Y;
    const r3y = menuOpen ? FEAT_ROW3_Y : HIDE_Y;
    const cx = menuOpen ? FEAT_COL_X : [HIDE_X, HIDE_X, HIDE_X, HIDE_X];
    _setBtnPos(killauraBtn, cx[0], r1y);
    _setBtnPos(aimbotBtn,   cx[1], r1y);
    _setBtnPos(dodgeBtn,    cx[2], r1y);
    _setBtnPos(espBtn,      cx[3], r1y);
    _setBtnPos(cameraBtn,   cx[0], r2y);
    _setBtnPos(sprayBtn,    cx[1], r2y);
    _setBtnPos(pinBtn,      cx[2], r2y);
    _setBtnPos(spinnerBtn,  cx[3], r2y);
    _setBtnPos(brawltvBtn,  cx[1], r3y);
    _setBtnPos(specBtn,     cx[2], r3y);
}

function createAllButtons() {
    if (buttonsCreated) return;
    if (!capturedParent || capturedParent.isNull()) return;
    if (!capturedAddChildAddr) return;

    try {
        const addChild = new NativeFunction(capturedAddChildAddr, "pointer", ["pointer", "pointer"]);

        try {
            const result = createButton("MENU", MENU_X, MENU_Y, capturedParent, addChild, 1);
            menuBtn = result.btn;
            menuTextField = result.textField;
            setButtonTextColor(menuTextField, RGBA.yellow);
        } catch (e) {
            menuBtn = null;
        }

        try {
            const result = createTextLabel("REvenge", REVENGE_LABEL_X, REVENGE_LABEL_Y, capturedParent, addChild, 24, RGBA.white);
            revengeLabelMc = result ? result.mc : null;
            revengeLabelTextField = result ? result.textField : null;
        } catch (e) {
            revengeLabelMc = null;
        }

        try {
            const result = createButton("Killaura", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            killauraBtn = result.btn;
            killauraTextField = result.textField;
            setButtonTextColor(killauraTextField, state.killaura ? RGBA.green : RGBA.red);
        } catch (e) { killauraBtn = null; }

        try {
            const result = createButton("Aimbot", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            aimbotBtn = result.btn;
            aimbotTextField = result.textField;
            setButtonTextColor(aimbotTextField, state.aimbot ? RGBA.green : RGBA.red);
        } catch (e) { aimbotBtn = null; }

        try {
            const result = createButton("Autododge", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            dodgeBtn = result.btn;
            dodgeTextField = result.textField;
            setButtonTextColor(dodgeTextField, state.autododge ? RGBA.green : RGBA.red);
        } catch (e) { dodgeBtn = null; }

        try {
            const result = createButton("ESP", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            espBtn = result.btn;
            espTextField = result.textField;
            setButtonTextColor(espTextField, state.esp ? RGBA.green : RGBA.red);
        } catch (e) { espBtn = null; }

        try {
            const result = createButton("Camera", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            cameraBtn = result.btn;
            cameraTextField = result.textField;
            setButtonTextColor(cameraTextField, state.camera ? RGBA.green : RGBA.red);
        } catch (e) { cameraBtn = null; }

        try {
            const result = createButton("Spray", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            sprayBtn = result.btn;
            sprayTextField = result.textField;
            setButtonTextColor(sprayTextField, state.spray ? RGBA.green : RGBA.red);
        } catch (e) { sprayBtn = null; }

        try {
            const result = createButton("Pin", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            pinBtn = result.btn;
            pinTextField = result.textField;
            setButtonTextColor(pinTextField, state.pin ? RGBA.green : RGBA.red);
        } catch (e) { pinBtn = null; }

        try {
            const result = createButton("Spinner", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            spinnerBtn = result.btn;
            spinnerTextField = result.textField;
            setButtonTextColor(spinnerTextField, state.spinner ? RGBA.green : RGBA.red);
        } catch (e) { spinnerBtn = null; }

        try {
            const result = createButton("BrawlTV", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            brawltvBtn = result.btn;
            brawltvTextField = result.textField;
            setButtonTextColor(brawltvTextField, state.brawltv ? RGBA.green : RGBA.red);
        } catch (e) { brawltvBtn = null; }

        try {
            const result = createButton("Spec", HIDE_X, HIDE_Y, capturedParent, addChild, 1);
            specBtn = result.btn;
            specTextField = result.textField;
            setButtonTextColor(specTextField, state.spec ? RGBA.green : RGBA.red);
        } catch (e) { specBtn = null; }

        applyMenuVisibility();

        buttonsCreated = true;
    } catch (e) {
        buttonsCreated = false;
    }
}

let _spectatorGoto = null;
let _spectatorSetText = null;
let _spectatorBrawltvStr = null;
let _spectatorSpecStr = null;
const _spectatorOpts = { brawltvCount: 69, specCount: 69 };

function _spectatorBuildCountStr(count) {
    try {
        const fns = getFunctions();
        const lc = getLibc();
        const raw = Memory.allocUtf8String(String(count));
        const buf = lc.malloc(128);
        fns.StringCtor(buf, raw);
        return buf;
    } catch (_) {
        return null;
    }
}

function setupSpectator(base) {
    try {
        _spectatorGoto = new NativeFunction(
            base.add(offsets.MovieClip_gotoAndStopFrameIndex),
            'pointer', ['pointer', 'int']
        );
        _spectatorSetText = new NativeFunction(
            base.add(offsets.TextField_setText),
            'pointer', ['pointer', 'pointer']
        );
        Interceptor.attach(base.add(offsets.BattleScreen__update), {
            onEnter(args) { this.screen = args[0]; },
            onLeave(_) {
                const wantBrawltv = state.brawltv;
                const wantSpec = state.spec;
                if (!wantBrawltv && !wantSpec) return;
                try {
                    const screen = this.screen;
                    if (!screen || screen.isNull()) return;
                    const widget = screen.add(offsets.BattleScreen_spectateWidget).readPointer();
                    if (!widget || widget.isNull()) return;
                    const tf = screen.add(offsets.BattleScreen_spectateTextField).readPointer();
                    if (!tf || tf.isNull()) return;

                    let str, frame;
                    if (wantBrawltv) {
                        if (!_spectatorBrawltvStr) _spectatorBrawltvStr = _spectatorBuildCountStr(_spectatorOpts.brawltvCount);
                        str = _spectatorBrawltvStr;
                        frame = 1;
                    } else {
                        if (!_spectatorSpecStr) _spectatorSpecStr = _spectatorBuildCountStr(_spectatorOpts.specCount);
                        str = _spectatorSpecStr;
                        frame = 0;
                    }
                    if (!str) return;

                    widget.add(8).writeU8(1);
                    _spectatorSetText(tf, str);
                    _spectatorGoto(widget, frame);
                } catch (_) {}
            }
        });
    } catch (_) {
        _spectatorGoto = null;
        _spectatorSetText = null;
    }
}

function setupUI(base) {
    Interceptor.attach(base.add(offsets.Sprite_addChild), {
        onEnter(args) {
            if (!capturedParent) {
                capturedParent = args[0];
                capturedAddChildAddr = base.add(offsets.Sprite_addChild);
                createAllButtons();
            }
        },
    });

    Interceptor.attach(base.add(offsets.ButtonCallback), {
        onEnter(args) {
            try {
                const clicked = args[0];
                if (!clicked || clicked.isNull()) return;

                if (menuBtn && !menuBtn.isNull() && clicked.equals(menuBtn)) {
                    menuOpen = !menuOpen;
                    applyMenuVisibility();
                    return;
                }

                if (killauraBtn && !killauraBtn.isNull() && clicked.equals(killauraBtn)) {
                    state.killaura = !state.killaura;
                    setButtonTextColor(killauraTextField, state.killaura ? RGBA.green : RGBA.red);
                }
                if (aimbotBtn && !aimbotBtn.isNull() && clicked.equals(aimbotBtn)) {
                    state.aimbot = !state.aimbot;
                    setButtonTextColor(aimbotTextField, state.aimbot ? RGBA.green : RGBA.red);
                }
                if (dodgeBtn && !dodgeBtn.isNull() && clicked.equals(dodgeBtn)) {
                    state.autododge = !state.autododge;
                    setButtonTextColor(dodgeTextField, state.autododge ? RGBA.green : RGBA.red);
                }
                if (espBtn && !espBtn.isNull() && clicked.equals(espBtn)) {
                    state.esp = !state.esp;
                    setButtonTextColor(espTextField, state.esp ? RGBA.green : RGBA.red);
                }
                if (cameraBtn && !cameraBtn.isNull() && clicked.equals(cameraBtn)) {
                    state.camera = !state.camera;
                    setButtonTextColor(cameraTextField, state.camera ? RGBA.green : RGBA.red);
                }
                if (sprayBtn && !sprayBtn.isNull() && clicked.equals(sprayBtn)) {
                    state.spray = !state.spray;
                    setButtonTextColor(sprayTextField, state.spray ? RGBA.green : RGBA.red);
                }
                if (pinBtn && !pinBtn.isNull() && clicked.equals(pinBtn)) {
                    state.pin = !state.pin;
                    setButtonTextColor(pinTextField, state.pin ? RGBA.green : RGBA.red);
                }
                if (spinnerBtn && !spinnerBtn.isNull() && clicked.equals(spinnerBtn)) {
                    state.spinner = !state.spinner;
                    setButtonTextColor(spinnerTextField, state.spinner ? RGBA.green : RGBA.red);
                }
                if (brawltvBtn && !brawltvBtn.isNull() && clicked.equals(brawltvBtn)) {
                    state.brawltv = !state.brawltv;
                    setButtonTextColor(brawltvTextField, state.brawltv ? RGBA.green : RGBA.red);
                }
                if (specBtn && !specBtn.isNull() && clicked.equals(specBtn)) {
                    state.spec = !state.spec;
                    setButtonTextColor(specTextField, state.spec ? RGBA.green : RGBA.red);
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
            espBtn = null;
            cameraBtn = null;
            sprayBtn = null;
            pinBtn = null;
            spinnerBtn = null;
            espTextField = null;
            cameraTextField = null;
            sprayTextField = null;
            pinTextField = null;
            spinnerTextField = null;
            brawltvBtn = null;
            specBtn = null;
            brawltvTextField = null;
            specTextField = null;
            menuBtn = null;
            menuTextField = null;
            menuOpen = false;
            revengeLabelMc = null;
            revengeLabelTextField = null;
            buttonsCreated = false;
        },
    });
}


const NAME_TAG_FROM = "[BSD]";
const NAME_TAG_TEXT = "REvenge";
const NAME_COLOR_LEFT  = [0xFF, 0x14, 0x93];
const NAME_COLOR_RIGHT = [0xFF, 0xE4, 0xE1];

function _buildNameTag() {
    const n = NAME_TAG_TEXT.length;
    const parts = ["["];
    for (let i = 0; i < n; i++) {
        const t = n <= 1 ? 0 : i / (n - 1);
        const r = Math.round(NAME_COLOR_LEFT[0] + (NAME_COLOR_RIGHT[0] - NAME_COLOR_LEFT[0]) * t);
        const g = Math.round(NAME_COLOR_LEFT[1] + (NAME_COLOR_RIGHT[1] - NAME_COLOR_LEFT[1]) * t);
        const b = Math.round(NAME_COLOR_LEFT[2] + (NAME_COLOR_RIGHT[2] - NAME_COLOR_LEFT[2]) * t);
        const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
        parts.push("<c" + hex + ">" + NAME_TAG_TEXT[i]);
    }
    parts.push("</c>]");
    return parts.join("");
}

const NAME_TAG = _buildNameTag();
const _NAME_CACHE_MAX = 64;
const _nameStrCache = new Map();

function _nameCreateScString(str) {
    const fns = getFunctions();
    const lc = getLibc();
    const raw = Memory.allocUtf8String(str);
    const obj = lc.malloc(256);
    fns.StringCtor(obj, raw);
    return obj;
}

function _nameReadInline(scStr, len) {
    try { return scStr.add(offsets.ScString_data).readUtf8String(len); }
    catch (_) { return null; }
}

function _nameReadHeap(scStr, len) {
    try {
        const p = scStr.add(offsets.ScString_data).readPointer();
        if (p && !p.isNull()) return p.readUtf8String(len);
    } catch (_) {}
    return null;
}

function _nameReadScText(scStr) {
    if (!scStr || scStr.isNull()) return null;
    let len;
    try { len = scStr.add(offsets.ScString_length).readU32(); }
    catch (_) { return null; }
    if (len <= 0 || len > 256) return null;
    const inline = _nameReadInline(scStr, len);
    if (inline && inline.indexOf(NAME_TAG_FROM) !== -1) return inline;
    const heap = _nameReadHeap(scStr, len);
    if (heap && heap.indexOf(NAME_TAG_FROM) !== -1) return heap;
    return null;
}

function _nameRewriteScArg(args, idx) {
    try {
        const text = _nameReadScText(args[idx]);
        if (!text) return;
        const fixed = text.split(NAME_TAG_FROM).join(NAME_TAG);
        let obj = _nameStrCache.get(fixed);
        if (!obj) {
            obj = _nameCreateScString(fixed);
            _nameStrCache.set(fixed, obj);
            if (_nameStrCache.size > _NAME_CACHE_MAX) {
                const firstKey = _nameStrCache.keys().next().value;
                if (firstKey !== undefined) _nameStrCache.delete(firstKey);
            }
        }
        args[idx] = obj;
    } catch (_) {}
}

function _nameAttach(base, off, argIdx) {
    try {
        Interceptor.attach(base.add(off), {
            onEnter(args) {
                if (!state.name) return;
                _nameRewriteScArg(args, argIdx);
            }
        });
    } catch (_) {}
}

function setupName(base) {
    _nameAttach(base, offsets.MovieClipHelper__setTextAndScaleIfNecessary, 1);
    _nameAttach(base, offsets.TextField_setText,                            1);
    _nameAttach(base, offsets.TextField_setText_ui,                         1);
}


let _camBs = null;
let _camBsTs = 0;
const _camOpts = { mode: 3 };

function getCameraBattleScreen()   { return _camBs; }
function getCameraBattleScreenTs() { return _camBsTs; }

function setupCamera(base) {
    try {
        const off = offsets.BattleScreen__updateCameraParameters;
        if (!off) return;
        Interceptor.attach(base.add(off), {
            onEnter(args) {
                const bs = args[0];
                if (!bs || bs.isNull()) return;
                _camBs = bs;
                _camBsTs = Date.now();
                if (!state.camera) return;
                try {
                    bs.add(offsets.CAM_MODE_OFFSET).writeS32(_camOpts.mode | 0);
                } catch (_) {}
            }
        });
    } catch (_) {}
}


const CMD_SPRAY_TYPE = 15;
const CMD_PIN_TYPE = 9;
const CMD_BUF_SIZE = 0x64;
let _sprayLastFire = 0;
const _SPRAY_INTERVAL_MS = 600;
let _pinLastFire = 0;
const _PIN_INTERVAL_MS = 800;

function _sendCommand(cmdType) {
    try {
        const fns = getFunctions();
        const battle = fns.BattleMode_getInstance();
        if (!battle || battle.isNull()) return false;
        const mgr = battle.add(offsets.BattleMode_clientInputManager).readPointer();
        if (!mgr || mgr.isNull()) return false;
        const lc = getLibc();
        const ci = lc.malloc(CMD_BUF_SIZE);
        if (!ci || ci.isNull()) return false;
        lc.memset(ci, 0, CMD_BUF_SIZE);
        fns.ClientInput_constructor_int(ci, cmdType);
        fns.ClientInputManager_addInput(mgr, ci);
        return true;
    } catch (_) { return false; }
}

function updateSpray(now) {
    if (!state.spray) return;
    if (now === undefined) now = Date.now();
    if (now - _sprayLastFire < _SPRAY_INTERVAL_MS) return;
    if (_sendCommand(CMD_SPRAY_TYPE)) _sprayLastFire = now;
}

function updatePin(now) {
    if (!state.pin) return;
    if (now === undefined) now = Date.now();
    if (now - _pinLastFire < _PIN_INTERVAL_MS) return;
    if (_sendCommand(CMD_PIN_TYPE)) _pinLastFire = now;
}


let _lastServerIP = null;

function _ipReadScString(p) {
    try {
        if (!p || p.isNull()) return null;
        const len = p.add(offsets.ScString_length).readU32();
        if (len === 0 || len > 256) return null;
        const sp = len < 8 ? p.add(offsets.ScString_data) : p.add(offsets.ScString_data).readPointer();
        if (!sp || sp.isNull()) return null;
        return sp.readUtf8String(len);
    } catch (_) { return null; }
}

function _ipIsPublicIp(ip) {
    if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 127) return false;
    if (p[0] === 10) return false;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
    if (p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 169 && p[1] === 254) return false;
    if (p[0] >= 224) return false;
    return true;
}

function _ipReport(ip, port) {
    const full = ip + ':' + port;
    if (_lastServerIP === full) return;
    _lastServerIP = full;
    try { send({ type: 'IP_CAPTURED', data: full }); } catch (_) {}
}

function setupIPGrabber(base) {
    try {
        Interceptor.attach(base.add(offsets.MessageManager__receiveMessage), {
            onEnter: function(args) {
                const msg = this.context.x1;
                if (!msg || msg.isNull()) return;
                try {
                    const port = msg.add(offsets.Message_port).readS32();
                    if (port <= 0 || port > 65535) return;
                    const ipPtr = msg.add(offsets.Message_ipPtr).readPointer();
                    const ip = _ipReadScString(ipPtr);
                    if (!_ipIsPublicIp(ip)) return;
                    _ipReport(ip, port);
                } catch (_) {}
            }
        });
    } catch (_) {}
}

const ESP_RING_SEGS = 32;
const ESP_BS_STALENESS_MS = 2000;
const ESP_SCAN_STALENESS_MS = 2000;
const ESP_PROJ_PATH_MAX_LENGTH = 3000;
const ESP_MAX_RINGS = 8;
const ESP_MAX_PROJ_PATHS = 32;

const ESP_OPTS = {
    showEnemyBox:        true,
    showEnemyRange:      true,
    showOwnRange:        true,
    showAimLine:         true,
    showProjectilePath:  false,
    enemyColor:          [1.0, 0.2, 0.2, 0.9],
    ownRangeColor:       [0.2, 0.9, 0.95, 0.55],
    enemyRangeColor:     [0.0, 0.0, 0.0, 0.6],
    aimLineColor:        [1.0, 1.0, 0.15, 0.95],
    projectilePathColor: [1.0, 0.55, 0.0, 0.85],
    lineThickness:       3,
};

let _espTargetCount = 0;
let _espEnemyRingCount = 0;
let _espMyRingValid = false;
let _espAimLine = null;
let _espSelfValid = false;
let _espSelfX = 0;
let _espSelfY = 0;
let _espSW = 0;
let _espSH = 0;
let _espLastUpd = 0;
let _espGlReady = false;
let _espGlFailed = false;
let _espProg = 0;
let _espPosLoc = -1;
let _espColLoc = -1;
let _espVbo = 0;
const _ESP_MAX_VERTS = 2048;
const _ESP_STRIDE_F  = 6;
const _ESP_STRIDE_B  = 24;
const _espVerts     = new Float32Array(_ESP_MAX_VERTS * _ESP_STRIDE_F);
const _espVertsU8   = new Uint8Array(_espVerts.buffer);
const _espBuf       = Memory.alloc(_espVerts.byteLength);
let _espVertCount   = 0;

const _ESP_GL_ARRAY_BUFFER        = 0x8892;
const _ESP_GL_DYNAMIC_DRAW        = 0x88E8;
const _ESP_GL_FLOAT               = 0x1406;
const _ESP_GL_LINES               = 0x0001;
const _ESP_GL_BLEND               = 0x0BE2;
const _ESP_GL_SRC_ALPHA           = 0x0302;
const _ESP_GL_ONE_MINUS_SRC_ALPHA = 0x0303;
const _ESP_GL_VERTEX_SHADER       = 0x8B31;
const _ESP_GL_FRAGMENT_SHADER     = 0x8B30;
const _ESP_GL_DEPTH_TEST          = 0x0B71;
const _ESP_GL_CULL_FACE           = 0x0B44;
const _ESP_GL_SCISSOR_TEST        = 0x0C11;

const _espGl = {};

function _espFindExport(libName, symbol) {
    try {
        const mod = Process.findModuleByName(libName);
        if (!mod) return null;
        let addr = null;
        try { addr = mod.findExportByName(symbol); } catch (_) {}
        if (!addr) { try { addr = mod.getExportByName(symbol); } catch (_) {} }
        return addr;
    } catch (_) { return null; }
}

function _espTryLoadGL() {
    const libs = ['libGLESv2.so', 'libGLES_mali.so', 'libGLES_adreno.so', 'libGL.so'];
    for (const lib of libs) {
        try {
            if (_espFindExport(lib, 'glCreateShader')) return lib;
        } catch (_) {}
    }
    return null;
}

function _espLoadGLFunctions(lib) {
    const f = (n, r, a) => new NativeFunction(_espFindExport(lib, n), r, a);
    _espGl.createShader        = f('glCreateShader',            'uint',  ['uint']);
    _espGl.shaderSource        = f('glShaderSource',            'void',  ['uint','int','pointer','pointer']);
    _espGl.compileShader       = f('glCompileShader',           'void',  ['uint']);
    _espGl.createProgram       = f('glCreateProgram',           'uint',  []);
    _espGl.attachShader        = f('glAttachShader',            'void',  ['uint','uint']);
    _espGl.linkProgram         = f('glLinkProgram',             'void',  ['uint']);
    _espGl.useProgram          = f('glUseProgram',              'void',  ['uint']);
    _espGl.getAttribLoc        = f('glGetAttribLocation',       'int',   ['uint','pointer']);
    _espGl.enableVertexAttrib  = f('glEnableVertexAttribArray', 'void',  ['uint']);
    _espGl.vertexAttribPtr     = f('glVertexAttribPointer',     'void',  ['uint','int','uint','uint8','int','pointer']);
    _espGl.drawArrays          = f('glDrawArrays',              'void',  ['uint','int','int']);
    _espGl.genBuffers          = f('glGenBuffers',              'void',  ['int','pointer']);
    _espGl.bindBuffer          = f('glBindBuffer',              'void',  ['uint','uint']);
    _espGl.bufferData          = f('glBufferData',              'void',  ['uint','int64','pointer','uint']);
    _espGl.enable              = f('glEnable',                  'void',  ['uint']);
    _espGl.disable             = f('glDisable',                 'void',  ['uint']);
    _espGl.blendFunc           = f('glBlendFunc',               'void',  ['uint','uint']);
    _espGl.lineWidth           = f('glLineWidth',               'void',  ['float']);
}

const _ESP_VERT_SHADER = 'attribute vec2 p;attribute vec4 vc;varying vec4 fc;void main(){fc=vc;gl_Position=vec4(p,0.0,1.0);}';
const _ESP_FRAG_SHADER = 'precision mediump float;varying vec4 fc;void main(){gl_FragColor=fc;}';

function _espInitGL() {
    if (_espGlReady || _espGlFailed) return;
    try {
        const lib = _espTryLoadGL();
        if (!lib) { _espGlFailed = true; return; }
        _espLoadGLFunctions(lib);
        const mkShader = (type, src) => {
            const s = _espGl.createShader(type);
            const sp = Memory.allocUtf8String(src);
            const pp = Memory.alloc(Process.pointerSize);
            pp.writePointer(sp);
            _espGl.shaderSource(s, 1, pp, ptr(0));
            _espGl.compileShader(s);
            return s;
        };
        const vs = mkShader(_ESP_GL_VERTEX_SHADER,   _ESP_VERT_SHADER);
        const fs = mkShader(_ESP_GL_FRAGMENT_SHADER, _ESP_FRAG_SHADER);
        _espProg = _espGl.createProgram();
        if (_espProg === 0) { _espGlFailed = true; return; }
        _espGl.attachShader(_espProg, vs);
        _espGl.attachShader(_espProg, fs);
        _espGl.linkProgram(_espProg);
        _espPosLoc = _espGl.getAttribLoc(_espProg, Memory.allocUtf8String('p'));
        _espColLoc = _espGl.getAttribLoc(_espProg, Memory.allocUtf8String('vc'));
        const vp = Memory.alloc(4);
        _espGl.genBuffers(1, vp);
        _espVbo = vp.readU32();
        _espGlReady = true;
    } catch (_) { _espGlFailed = true; }
}

function _espSetVert(idx, nx, ny, r, g, b, a) {
    const off = idx * _ESP_STRIDE_F;
    _espVerts[off    ] = nx;
    _espVerts[off + 1] = ny;
    _espVerts[off + 2] = r;
    _espVerts[off + 3] = g;
    _espVerts[off + 4] = b;
    _espVerts[off + 5] = a;
}

function _espPushSeg(idx, ax, ay, bx, by, r, g, b_, a) {
    if (idx + 2 > _ESP_MAX_VERTS) return idx;
    _espSetVert(idx,     ax, ay, r, g, b_, a);
    _espSetVert(idx + 1, bx, by, r, g, b_, a);
    return idx + 2;
}

function _espPushBox(idx, sx, sy, r, g, b, a) {
    const nx = (sx / _espSW) * 2 - 1;
    const ny = 1 - (sy / _espSH) * 2;
    const bw = 80 / _espSW, bh = 120 / _espSH;
    const x0 = nx - bw / 2, x1 = nx + bw / 2;
    idx = _espPushSeg(idx, x0, ny,      x1, ny,      r, g, b, a);
    idx = _espPushSeg(idx, x1, ny,      x1, ny + bh, r, g, b, a);
    idx = _espPushSeg(idx, x1, ny + bh, x0, ny + bh, r, g, b, a);
    idx = _espPushSeg(idx, x0, ny + bh, x0, ny,      r, g, b, a);
    return idx;
}

function _espPushRing(idx, pts, r, g, b, a) {
    const n = ESP_RING_SEGS;
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        if (!p1.valid || !p2.valid) continue;
        const ax = (p1.sx / _espSW) * 2 - 1, ay = 1 - (p1.sy / _espSH) * 2;
        const bx = (p2.sx / _espSW) * 2 - 1, by_ = 1 - (p2.sy / _espSH) * 2;
        idx = _espPushSeg(idx, ax, ay, bx, by_, r, g, b, a);
    }
    return idx;
}

const _espMMat = new Float32Array(16);
const _espRingCos = new Float32Array(ESP_RING_SEGS);
const _espRingSin = new Float32Array(ESP_RING_SEGS);
(function () {
    for (let i = 0; i < ESP_RING_SEGS; i++) {
        const a = i * (Math.PI * 2 / ESP_RING_SEGS);
        _espRingCos[i] = Math.cos(a);
        _espRingSin[i] = Math.sin(a);
    }
})();

const _espRingPools = new Array(ESP_MAX_RINGS);
for (let i = 0; i < ESP_MAX_RINGS; i++) {
    const r = new Array(ESP_RING_SEGS);
    for (let j = 0; j < ESP_RING_SEGS; j++) r[j] = { sx: 0, sy: 0, valid: false };
    _espRingPools[i] = r;
}
const _espMyRingPool = new Array(ESP_RING_SEGS);
for (let i = 0; i < ESP_RING_SEGS; i++) _espMyRingPool[i] = { sx: 0, sy: 0, valid: false };
const _espTargetsPool = new Array(ESP_MAX_RINGS);
for (let i = 0; i < ESP_MAX_RINGS; i++) _espTargetsPool[i] = { sx: 0, sy: 0, los: false };
const _espW2sTmp = { sx: 0, sy: 0, valid: false };
const _espAimLineSlot = { ax: 0, ay: 0, bx: 0, by: 0 };
const _espAimW2sTmp = { sx: 0, sy: 0, valid: false };
const _espProjPathPool = new Array(ESP_MAX_PROJ_PATHS);
for (let i = 0; i < ESP_MAX_PROJ_PATHS; i++) _espProjPathPool[i] = { ax: 0, ay: 0, bx: 0, by: 0 };
let _espProjPathCount = 0;
const _espProjW2sA = { sx: 0, sy: 0, valid: false };
const _espProjW2sB = { sx: 0, sy: 0, valid: false };

function _espRefreshMatrix(bs) {
    try {
        _espSW = bs.add(offsets.BattleScreen_screenWidth).readFloat();
        _espSH = bs.add(offsets.BattleScreen_screenHeight).readFloat();
        if (_espSW <= 0 || _espSH <= 0) return false;
        const buf = bs.add(offsets.BattleScreen_viewMatrix).readByteArray(64);
        if (!buf) return false;
        const dv = new DataView(buf);
        for (let i = 0; i < 16; i++) _espMMat[i] = dv.getFloat32(i * 4, true);
        return true;
    } catch (_) { return false; }
}

function _espW2sInto(wx, wy, out) {
    const M = _espMMat;
    const y = -wy;
    const cx = M[0]*wx + M[4]*y + M[12];
    const cy = M[1]*wx + M[5]*y + M[13];
    const cw = M[3]*wx + M[7]*y + M[15];
    if (cw <= 1e-6) { out.valid = false; return false; }
    const iw = 1 / cw;
    out.sx = (cx*iw*0.5+0.5)*_espSW;
    out.sy = (1-(cy*iw*0.5+0.5))*_espSH;
    out.valid = true;
    return true;
}

function _espRingPointsInto(cx, cy, r, pool) {
    for (let i = 0; i < ESP_RING_SEGS; i++) {
        _espW2sInto(cx + _espRingCos[i] * r, cy + _espRingSin[i] * r, pool[i]);
    }
}

function _espTraceWallHit(wx, wy, dirX, dirY, maxDist, checkBit) {
    const wc = getWallCache();
    if (!wc || maxDist <= 0) return maxDist;
    const w = getWallCacheW(), h = getWallCacheH();
    if (w <= 0 || h <= 0) return maxDist;
    const stepSize = 40;
    const inv = 1 / 300;
    let dist = 0;
    while (dist < maxDist) {
        dist += stepSize;
        if (dist > maxDist) dist = maxDist;
        const tx = ((wx + dirX * dist) * inv) | 0;
        const ty = ((wy + dirY * dist) * inv) | 0;
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) return Math.max(0, dist - 75);
        if (wc[ty * w + tx] & checkBit) return Math.max(0, dist - 75);
    }
    return maxDist;
}

function _espDrawFrame() {
    if (!_espGlReady || _espSW <= 0 || _espSH <= 0) return;
    if (_espLastUpd > 0 && Date.now() - _espLastUpd > 1500) {
        _espTargetCount = 0; _espEnemyRingCount = 0; _espMyRingValid = false; _espAimLine = null; _espSelfValid = false; _espProjPathCount = 0;
    }
    if (_espTargetCount === 0 && !_espMyRingValid && _espEnemyRingCount === 0 && !_espAimLine && _espProjPathCount === 0) return;
    try {
        let idx = 0;
        if (ESP_OPTS.showEnemyRange) {
            const erc = ESP_OPTS.enemyRangeColor;
            for (let i = 0; i < _espEnemyRingCount; i++) {
                idx = _espPushRing(idx, _espRingPools[i], erc[0], erc[1], erc[2], erc[3]);
            }
        }
        if (ESP_OPTS.showOwnRange && _espMyRingValid) {
            const orc = ESP_OPTS.ownRangeColor;
            idx = _espPushRing(idx, _espMyRingPool, orc[0], orc[1], orc[2], orc[3]);
        }
        const ox = _espSelfValid ? (_espSelfX / _espSW) * 2 - 1 : 0;
        const oy = _espSelfValid ? 1 - (_espSelfY / _espSH) * 2 : 0;
        const ec = ESP_OPTS.enemyColor;
        for (let i = 0; i < _espTargetCount; i++) {
            const t = _espTargetsPool[i];
            if (ESP_OPTS.showEnemyBox) {
                if (t.los && _espSelfValid) {
                    const tx = (t.sx / _espSW) * 2 - 1;
                    const ty = 1 - (t.sy / _espSH) * 2;
                    idx = _espPushSeg(idx, ox, oy, tx, ty, ec[0], ec[1], ec[2], ec[3]);
                }
                idx = _espPushBox(idx, t.sx, t.sy, ec[0], ec[1], ec[2], ec[3]);
            }
        }
        if (ESP_OPTS.showAimLine && _espAimLine) {
            const al = _espAimLine;
            const ax = (al.ax / _espSW) * 2 - 1, ay = 1 - (al.ay / _espSH) * 2;
            const bx = (al.bx / _espSW) * 2 - 1, by_ = 1 - (al.by / _espSH) * 2;
            const ac = ESP_OPTS.aimLineColor;
            idx = _espPushSeg(idx, ax, ay, bx, by_, ac[0], ac[1], ac[2], ac[3]);
        }
        if (ESP_OPTS.showProjectilePath && _espProjPathCount > 0) {
            const pc = ESP_OPTS.projectilePathColor;
            for (let i = 0; i < _espProjPathCount; i++) {
                const pp = _espProjPathPool[i];
                const ax = (pp.ax / _espSW) * 2 - 1, ay = 1 - (pp.ay / _espSH) * 2;
                const bx = (pp.bx / _espSW) * 2 - 1, by_ = 1 - (pp.by / _espSH) * 2;
                idx = _espPushSeg(idx, ax, ay, bx, by_, pc[0], pc[1], pc[2], pc[3]);
            }
        }
        if (idx === 0) return;
        _espVertCount = idx;
        _espBuf.writeByteArray(_espVertsU8.subarray(0, _espVertCount * _ESP_STRIDE_B));
        _espGl.disable(_ESP_GL_DEPTH_TEST);
        _espGl.disable(_ESP_GL_CULL_FACE);
        _espGl.disable(_ESP_GL_SCISSOR_TEST);
        _espGl.enable(_ESP_GL_BLEND);
        _espGl.blendFunc(_ESP_GL_SRC_ALPHA, _ESP_GL_ONE_MINUS_SRC_ALPHA);
        _espGl.useProgram(_espProg);
        _espGl.bindBuffer(_ESP_GL_ARRAY_BUFFER, _espVbo);
        _espGl.bufferData(_ESP_GL_ARRAY_BUFFER, _espVertCount * _ESP_STRIDE_B, _espBuf, _ESP_GL_DYNAMIC_DRAW);
        _espGl.enableVertexAttrib(_espPosLoc);
        _espGl.vertexAttribPtr(_espPosLoc, 2, _ESP_GL_FLOAT, 0, _ESP_STRIDE_B, ptr(0));
        _espGl.enableVertexAttrib(_espColLoc);
        _espGl.vertexAttribPtr(_espColLoc, 4, _ESP_GL_FLOAT, 0, _ESP_STRIDE_B, ptr(8));
        _espGl.lineWidth(ESP_OPTS.lineThickness);
        _espGl.drawArrays(_ESP_GL_LINES, 0, _espVertCount);
        _espGl.useProgram(0);
        _espGl.bindBuffer(_ESP_GL_ARRAY_BUFFER, 0);
    } catch (_) { _espGlFailed = true; }
}

function updateESP() {
    if (!state.esp) {
        _espTargetCount = 0; _espEnemyRingCount = 0; _espMyRingValid = false;
        _espAimLine = null; _espSelfValid = false; _espProjPathCount = 0;
        return;
    }
    const now = Date.now();
    let bs = getCameraBattleScreen();
    let bsTs = getCameraBattleScreenTs();
    if (!bs || bs.isNull() || (bsTs > 0 && now - bsTs > ESP_BS_STALENESS_MS)) {
        bs = _battleScreen;
        bsTs = _battleScreenTs;
    }
    if (!bs || bs.isNull() || (bsTs > 0 && now - bsTs > ESP_BS_STALENESS_MS) ||
        scanData.lastUpdate === 0 || now - scanData.lastUpdate > ESP_SCAN_STALENESS_MS ||
        !scanData.ownCharacter || scanData.myX === undefined || scanData.myX === -1) {
        _espTargetCount = 0; _espEnemyRingCount = 0; _espMyRingValid = false; _espAimLine = null; _espSelfValid = false; _espProjPathCount = 0;
        return;
    }
    if (!_espRefreshMatrix(bs)) {
        _espTargetCount = 0; _espEnemyRingCount = 0; _espMyRingValid = false; _espAimLine = null; _espSelfValid = false; _espProjPathCount = 0;
        return;
    }

    const mx = scanData.myX, my = scanData.myY;
    _espSelfValid = _espW2sInto(mx, my, _espW2sTmp);
    if (_espSelfValid) { _espSelfX = _espW2sTmp.sx; _espSelfY = _espW2sTmp.sy; }

    const myRange = (scanData.myBrawlerName && RANGE_BY_NAME[scanData.myBrawlerName])
        || BRAWLER_RANGE[scanData.myBrawlerId] || 0;
    if (myRange > 0) {
        _espRingPointsInto(mx, my, myRange, _espMyRingPool);
        _espMyRingValid = true;
    } else {
        _espMyRingValid = false;
    }

    const enemies = scanData.enemies;
    let tCount = 0;
    let rCount = 0;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.x === -1 || e.y === -1) continue;
        if (tCount >= ESP_MAX_RINGS) break;
        if (!_espW2sInto(e.x, e.y, _espW2sTmp)) continue;
        const slot = _espTargetsPool[tCount];
        slot.sx = _espW2sTmp.sx;
        slot.sy = _espW2sTmp.sy;
        slot.los = losCheck(mx, my, e.x, e.y, 0x40);
        tCount++;
        const eR = (e.brawlerName && RANGE_BY_NAME[e.brawlerName])
            || BRAWLER_RANGE[e.brawlerId] || 0;
        if (eR <= 0) continue;
        _espRingPointsInto(e.x, e.y, eR, _espRingPools[rCount]);
        rCount++;
    }
    _espTargetCount = tCount;
    _espEnemyRingCount = rCount;

    _espProjPathCount = 0;
    if (ESP_OPTS.showProjectilePath) {
        const projs = scanData.projectiles;
        if (projs && projs.length > 0) {
            for (let i = 0; i < projs.length; i++) {
                const p = projs[i];
                if (!p || p.isBeam) continue;
                if (_espProjPathCount >= ESP_MAX_PROJ_PATHS) break;
                let dx = 0, dy = 0;
                if (p.spawnAngle !== null && p.spawnAngle !== undefined && isFinite(p.spawnAngle)) {
                    dx = Math.cos(p.spawnAngle);
                    dy = Math.sin(p.spawnAngle);
                }
                if (dx === 0 && dy === 0) continue;
                const dist = _espTraceWallHit(p.x, p.y, dx, dy, ESP_PROJ_PATH_MAX_LENGTH, 0x40);
                if (dist <= 0) continue;
                const ex = p.x + dx * dist;
                const ey = p.y + dy * dist;
                if (!_espW2sInto(p.x, p.y, _espProjW2sA)) continue;
                if (!_espW2sInto(ex, ey, _espProjW2sB)) continue;
                const slot = _espProjPathPool[_espProjPathCount++];
                slot.ax = _espProjW2sA.sx;
                slot.ay = _espProjW2sA.sy;
                slot.bx = _espProjW2sB.sx;
                slot.by = _espProjW2sB.sy;
            }
        }
    }

    _espAimLine = null;
    if (_espSelfValid && (state.aimbot || state.killaura)) {
        const tid = bestTargetId;
        if (tid) {
            const aim = computeAimForTarget(tid, mx, my);
            if (aim && _espW2sInto(aim.x, aim.y, _espAimW2sTmp)) {
                _espAimLineSlot.ax = _espSelfX;
                _espAimLineSlot.ay = _espSelfY;
                _espAimLineSlot.bx = _espAimW2sTmp.sx;
                _espAimLineSlot.by = _espAimW2sTmp.sy;
                _espAimLine = _espAimLineSlot;
            }
        }
    }
    _espLastUpd = now;
}

function resetESP() {
    _espTargetCount = 0; _espEnemyRingCount = 0; _espMyRingValid = false;
    _espAimLine = null; _espSelfValid = false; _espProjPathCount = 0;
    _espSW = 0; _espSH = 0; _espLastUpd = 0;
}

let _espHookInstalled = false;
let _espSetupRetries = 0;
const _ESP_MAX_RETRIES = 30;

function setupESP() {
    if (_espHookInstalled) return;
    try {
        const libEGL = Process.findModuleByName('libEGL.so');
        if (!libEGL) { _scheduleESPRetry(); return; }
        let eglReal = null;
        try { eglReal = libEGL.findExportByName('eglSwapBuffers'); } catch (_) {}
        if (!eglReal) { try { eglReal = libEGL.getExportByName('eglSwapBuffers'); } catch (_) {} }
        if (!eglReal) { _scheduleESPRetry(); return; }
        Interceptor.attach(eglReal, {
            onEnter: function () {
                try {
                    if (!_espGlReady && !_espGlFailed) _espInitGL();
                    _espDrawFrame();
                } catch (_) {}
            }
        });
        _espHookInstalled = true;
    } catch (_) { _scheduleESPRetry(); }
}

function _scheduleESPRetry() {
    if (_espHookInstalled) return;
    if (_espSetupRetries++ >= _ESP_MAX_RETRIES) return;
    setTimeout(setupESP, 1000);
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
      setupName(base);
      setupCamera(base);
      setupIPGrabber(base);
      setupESP();
      setupSpectator(base);

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
            resetESP();
            profileManager.clearAll();
          }

          const now = Date.now();
          if (now - lastTickTime < 16) return;
          lastTickTime = now;

          updateScanner(bm);
          if (state.aimbot || state.killaura) updateAimbot();
          if (state.killaura) updateKillaura();
          if (state.autododge) updateAutododge();
          if (state.esp) updateESP();
          if (state.spray) updateSpray(now);
          if (state.pin) updatePin(now);
        }
      });

    });
  }).catch(() => {});
}

startAgent();