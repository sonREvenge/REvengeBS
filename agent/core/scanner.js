import { getFunctions } from "./functions.js";
import { offsets } from "./offsets.js";

let _base = null;
let _brawlerNameCache = new Map();
let _scanCount = 0;
const _activeGidSet = new Set();
let _isBeamFn = null;

export const scanData = {
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
    try {
        const namePtr = data.add(offsets.HeroData_namePtr).readPointer();
        if (!namePtr || namePtr.isNull()) return null;
        const str = namePtr.readCString();
        if (str && str.startsWith('hero_icon_')) return str.substring(10).toUpperCase();
        return null;
    } catch (_) { return null; }
}

export function updateScanner(bm, now) {
    if (!_base) return;
    if (now === undefined) now = Date.now();
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
        const vtableProj = _base.add(offsets.VTABLE_PROJECTILE_DATA);
        const stride = offsets.ObjectManager_ptrStride;

        let batchView = null;
        try {
            const buf = Memory.readByteArray(objects, count * stride);
            if (buf) batchView = new DataView(buf);
        } catch (_) { batchView = null; }

        for (let i = 0; i < count; i++) {
            try {
                let obj;
                if (batchView) {
                    const off = i * stride;
                    const lo = batchView.getUint32(off, true);
                    const hi = batchView.getUint32(off + 4, true);
                    if (lo === 0 && hi === 0) continue;
                    obj = ptr(hi * 0x100000000 + lo);
                } else {
                    obj = objects.add(i * stride).readPointer();
                    if (!obj || obj.isNull()) continue;
                }

                const team = obj.add(offsets.GameObj_team).readU32();
                const isEnemy = (team !== scanData.myTeamId);

                if (obj.add(offsets.GameObj_deadFlag).readU32() !== 0) continue;

                const data = functions.LogicGameObjectClient_getData(obj);
                if (!data || data.isNull()) continue;

                const isProjectile = data.readPointer().equals(vtableProj);
                if (isProjectile) {
                    if (!isEnemy) continue;
                    let spawnAngle = null;
                    try {
                        const raw = obj.add(offsets.Projectile_spawnAngle).readFloat();
                        if (isFinite(raw)) spawnAngle = raw;
                    } catch (_) { }
                    let isBeam = false;
                    try { if (_isBeamFn) isBeam = !!_isBeamFn(data); } catch (_) { }
                    projectiles.push({
                        gid: functions.LogicGameObjectClient_getGlobalID(obj).toString(),
                        x: functions.LogicGameObjectClient_getX(obj) | 0,
                        y: functions.LogicGameObjectClient_getY(obj) | 0,
                        speed: functions.LogicProjectileData_getSpeed(data) || 1200,
                        radius: functions.LogicProjectileData_getRadius(data) || 8,
                        spawnAngle: spawnAngle,
                        isBeam: isBeam
                    });
                    continue;
                }
                if (!isEnemy) continue;

                const gid = functions.LogicGameObjectClient_getGlobalID(obj).toString();

                let brawlerName = _brawlerNameCache.get(gid);
                if (brawlerName === undefined) {
                    brawlerName = readHeroIconName(data);
                    _brawlerNameCache.set(gid, brawlerName);
                    if (brawlerName === null) continue;
                } else if (brawlerName === null) {
                    continue;
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
            } catch (_) { }
        }

        _scanCount++;
        if ((_scanCount & 0x3F) === 0) {
            _activeGidSet.clear();
            for (let i = 0; i < enemies.length; i++) _activeGidSet.add(enemies[i].gid);
            for (const gid of _brawlerNameCache.keys()) {
                if (_brawlerNameCache.get(gid) !== null && !_activeGidSet.has(gid)) {
                    _brawlerNameCache.delete(gid);
                }
            }
        }

        scanData.enemies = enemies;
        scanData.projectiles = projectiles;
        scanData.lastUpdate = now;
    } catch (_) {}
}

export function resetScannerCache() {
    _brawlerNameCache.clear();
}

export function initScanner(base) {
    _base = base;
    try {
        _isBeamFn = new NativeFunction(base.add(offsets.LogicProjectileData__isBeam), 'bool', ['pointer']);
    } catch (_) { _isBeamFn = null; }
}
