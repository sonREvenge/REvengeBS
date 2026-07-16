import { getFunctions } from "./functions.js";
import { offsets } from "./offsets.js";

let _base = null;
let _brawlerNameCache = new Map();
let _scanCount = 0;
const _activeGidSet = new Set();
const _projMeta = new Map();
let _isBeamFn = null;

const PROJ_EMA_ALPHA = 0.4;
const PROJ_MIN_DELTA_SQ = 64;

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

const MASSIVE_RADIUS_THRESHOLD = 380;

function _classify(speed, radius) {
    const isSlow = (speed <= 800);
    const isSpread = (radius === 0 && speed >= 1400 && speed <= 1600);
    const isSniper = (speed > 3500);
    let hitRadius;
    if (radius > 0)        hitRadius = radius * 1.05;
    else if (isSlow)       hitRadius = 520;
    else if (isSpread)     hitRadius = 320;
    else if (isSniper)     hitRadius = 350;
    else                   hitRadius = 240;
    const isMassive = hitRadius > MASSIVE_RADIUS_THRESHOLD || radius > MASSIVE_RADIUS_THRESHOLD;
    return {
        isSlow, isSpread, isSniper, isMassive, hitRadius,
        category: isSlow ? 'slow' : isSpread ? 'spread' : isSniper ? 'sniper' : 'normal'
    };
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
        const seenProjGids = new Set();

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
                    const gid = functions.LogicGameObjectClient_getGlobalID(obj).toString();
                    seenProjGids.add(gid);

                    const px = functions.LogicGameObjectClient_getX(obj) | 0;
                    const py = functions.LogicGameObjectClient_getY(obj) | 0;

                    let meta = _projMeta.get(gid);
                    if (!meta) {
                        const radius = functions.LogicProjectileData_getRadius(data) || 0;
                        let rawSpeed = functions.LogicProjectileData_getSpeed(data) | 0;
                        if (rawSpeed <= 0 || rawSpeed > 15000) rawSpeed = 4000;
                        let isBeam = false;
                        try { if (_isBeamFn) isBeam = !!_isBeamFn(data); } catch (_) {}
                        let spawnAngle = null;
                        try {
                            const raw = obj.add(offsets.Projectile_spawnAngle).readFloat();
                            if (isFinite(raw)) spawnAngle = raw;
                        } catch (_) {}
                        const cls = _classify(rawSpeed, radius);
                        meta = {
                            speed: rawSpeed,
                            radius,
                            isBeam,
                            isSlow: cls.isSlow,
                            isSpread: cls.isSpread,
                            isSniper: cls.isSniper,
                            isMassive: cls.isMassive,
                            hitRadius: cls.hitRadius,
                            category: cls.category,
                            spawnAngle,
                            spawnX: px,
                            spawnY: py,
                            lastX: px,
                            lastY: py,
                            lastTs: now,
                            vxEma: 0,
                            vyEma: 0,
                            dirX: spawnAngle !== null ? Math.cos(spawnAngle * Math.PI / 180) : 0,
                            dirY: spawnAngle !== null ? Math.sin(spawnAngle * Math.PI / 180) : 0,
                            dynReady: spawnAngle !== null,
                        };
                        _projMeta.set(gid, meta);
                    } else {
                        const dt = (now - meta.lastTs) / 1000;
                        const ddx = px - meta.lastX;
                        const ddy = py - meta.lastY;
                        if (dt > 0.002 && dt < 0.3 && (ddx * ddx + ddy * ddy) >= PROJ_MIN_DELTA_SQ) {
                            const invDt = 1 / dt;
                            const mvX = ddx * invDt;
                            const mvY = ddy * invDt;
                            const alpha = meta.dynReady ? PROJ_EMA_ALPHA : 1.0;
                            meta.vxEma = meta.vxEma * (1 - alpha) + mvX * alpha;
                            meta.vyEma = meta.vyEma * (1 - alpha) + mvY * alpha;
                            const ns = Math.sqrt(meta.vxEma * meta.vxEma + meta.vyEma * meta.vyEma);
                            if (ns > 1e-3) {
                                meta.dirX = meta.vxEma / ns;
                                meta.dirY = meta.vyEma / ns;
                            }
                            meta.dynReady = true;
                            meta.lastX = px;
                            meta.lastY = py;
                            meta.lastTs = now;
                        }
                    }

                    projectiles.push({
                        gid,
                        x: px,
                        y: py,
                        speed: meta.speed,
                        radius: meta.radius,
                        spawnAngle: meta.spawnAngle,
                        isBeam: meta.isBeam,
                        hitRadius: meta.hitRadius,
                        category: meta.category,
                        isSlow: meta.isSlow,
                        isSpread: meta.isSpread,
                        isSniper: meta.isSniper,
                        isMassive: meta.isMassive,
                        dirX: meta.dirX,
                        dirY: meta.dirY,
                        vxEma: meta.vxEma,
                        vyEma: meta.vyEma,
                        spawnX: meta.spawnX,
                        spawnY: meta.spawnY,
                        dynReady: meta.dynReady,
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
        if ((_scanCount & 0x0F) === 0) {
            for (const gid of _projMeta.keys()) {
                if (!seenProjGids.has(gid)) _projMeta.delete(gid);
            }
        }

        scanData.enemies = enemies;
        scanData.projectiles = projectiles;
        scanData.lastUpdate = now;
    } catch (_) {}
}

export function resetScannerCache() {
    _brawlerNameCache.clear();
    _projMeta.clear();
}

export function initScanner(base) {
    _base = base;
    try {
        _isBeamFn = new NativeFunction(base.add(offsets.LogicProjectileData__isBeam), 'bool', ['pointer']);
    } catch (_) { _isBeamFn = null; }
}
