import { losCheck, getWallCache, getWallCacheW, getWallCacheH, getWallCacheGen } from "../utils/wallCache.js";
import { getFunctions } from "../core/functions.js";
import { offsets } from "../core/offsets.js";
import { getLibc } from "../utils/utils.js";
import { state } from "../utils/flags.js";
import { scanData } from "../core/scanner.js";
import { CONFIG } from "../utils/config.js";
import { logInfo, isLoggingEnabled } from "../utils/logger.js";

function _log(msg, data) {
    logInfo(msg, data);
}

let _lastTickLogTs = 0;
function _tickLog(msg, data) {
    if (!isLoggingEnabled()) return;
    const now = Date.now();
    if (now - _lastTickLogTs < 500) return;
    _lastTickLogTs = now;
    _log(msg, data);
}

const BRAWLER_AOE_IMPACT_RADIUS = {
    6: 220, 9: 240, 22: 260, 37: 240, 40: 180, 48: 220, 82: 200,
};
const PROJECTILE_OWNER_SNAP_DIST_SQ = 1500 * 1500;
const URGENT_WINDOW_CACHE_MS = 250;

const SPIN_RADIUS = 25;
let SPIN_STEP = Math.PI / 4;

export function setSpinnerOptions(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (typeof opts.speed === 'number' && isFinite(opts.speed)) {
        const t = Math.max(0, Math.min(100, opts.speed)) / 100;
        SPIN_STEP = 0.1 + t * 1.4;
    }
}

const projectiles = new Map();
let g_dodgeUntil = 0;
let _dodgeDir = null;
let _lockOriginX = 0;
let _lockOriginY = 0;
let _spinPhase = 0;
let _lastSyncTime = 0;
let _lastThreatTs = 0;

const _walkCache = new Map();
let _walkCacheTileX = -9999;
let _walkCacheTileY = -9999;
let _wcGen = -1;
let _cachedUrgentWindow = 0.9;
let _cachedUrgentWindowTs = 0;

const _activeProjs = [];
let _maxProjSpeed = 0;
let _wc = null, _wcW = 0, _wcH = 0;

let _base = null;
let _fns = null;
let _isBeamFn = null;

const CACHED_DIRECTIONS = [];
function _checkInitDirections() {
    if (CACHED_DIRECTIONS.length === 0 && CONFIG.N_DIRECTIONS_FLOUMPFITOU > 0) {
        for (let i = 0; i < CONFIG.N_DIRECTIONS_FLOUMPFITOU; i++) {
            const a = (Math.PI * 2 * i) / CONFIG.N_DIRECTIONS_FLOUMPFITOU;
            CACHED_DIRECTIONS.push({ x: Math.cos(a), y: Math.sin(a) });
        }
    }
}

export function getDodgeDir() { return _dodgeDir; }

export function resetAutododge() {
    _log('resetAutododge called (projMap was ' + projectiles.size + ')');
    projectiles.clear();
    _activeProjs.length = 0;
    _dodgeDir = null;
    g_dodgeUntil = 0;
    _lockOriginX = 0;
    _lockOriginY = 0;
    _walkCache.clear();
    _walkCacheTileX = -9999;
    _walkCacheTileY = -9999;
    _wcGen = -1;
    _cachedUrgentWindowTs = 0;
    _spinPhase = 0;
    _lastThreatTs = 0;
}

function getUrgentWindow() {
    const now = Date.now();
    if (now - _cachedUrgentWindowTs < URGENT_WINDOW_CACHE_MS) return _cachedUrgentWindow;
    const speed = Math.max(420, Math.min(900, CONFIG.CHAR_SPEED_VROUMBOLOS || 720));
    const norm = (speed - 420) / 480;
    let base = CONFIG.T_URGENT_MIN_GLOUBIBOULGA + (1 - norm) * (CONFIG.T_URGENT_MAX_GLOUBIBOULGO - CONFIG.T_URGENT_MIN_GLOUBIBOULGA);
    if (_maxProjSpeed > 1800) {
        base += Math.min(0.25, (_maxProjSpeed - 1800) / 1080 * 0.25);
    }
    _cachedUrgentWindow = base;
    _cachedUrgentWindowTs = now;
    return base;
}

function sameDirection(a, b) {
    if (!a || !b) return false;
    return (a.x * b.x + a.y * b.y) > 0.98;
}

function _walkRayClear(wx0, wy0, wx1, wy1) {
    const w = _wcW, h = _wcH;
    let cx = (wx0 / 300) | 0, cy = (wy0 / 300) | 0;
    const tx1 = (wx1 / 300) | 0, ty1 = (wy1 / 300) | 0;
    if (cx === tx1 && cy === ty1) return true;
    const dx = Math.abs(tx1 - cx), dy = -Math.abs(ty1 - cy);
    const sx = cx < tx1 ? 1 : -1, sy = cy < ty1 ? 1 : -1;
    let err = dx + dy;
    const maxSteps = dx + (-dy) + 2;
    for (let n = 0; n < maxSteps; n++) {
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return false;
        if (_wc[cy * w + cx] & 0x80) return false;
        if (cx === tx1 && cy === ty1) return true;
    }
    return true;
}

function _clampW(v, max) {
    return v < 0 ? 0 : (v > max ? max : v);
}

function isDirectionWalkable(fromX, fromY, dirX, dirY, charRadius) {
    const key = ((fromX / 300) | 0) * 1000000 + ((fromY / 300) | 0) * 1000 + ((dirX * 8) | 0) * 32 + ((dirY * 8) | 0);
    const cached = _walkCache.get(key);
    if (cached !== undefined) return cached;
    if (!_wc) { _walkCache.set(key, true); return true; }

    let probeD = CONFIG.CHAR_SPEED_VROUMBOLOS * CONFIG.PROBE_TIME_S_NIBOULAXOR;
    if (probeD < CONFIG.PROBE_MIN_TROUFOULKIM) probeD = CONFIG.PROBE_MIN_TROUFOULKIM;
    else if (probeD > CONFIG.PROBE_MAX_TROUFOULKAM) probeD = CONFIG.PROBE_MAX_TROUFOULKAM;
    const toX = fromX + dirX * probeD;
    const toY = fromY + dirY * probeD;
    const maxWX = _wcW * 300 - 1;
    const maxWY = _wcH * 300 - 1;
    if (toX < 0 || toY < 0 || toX > maxWX || toY > maxWY) {
        _walkCache.set(key, false);
        return false;
    }
    const pr = charRadius * 0.9;
    const perpX = -dirY * pr;
    const perpY = dirX * pr;

    const ok = _walkRayClear(fromX, fromY, toX, toY)
            && _walkRayClear(_clampW(fromX + perpX, maxWX), _clampW(fromY + perpY, maxWY),
                             _clampW(toX + perpX, maxWX),   _clampW(toY + perpY, maxWY))
            && _walkRayClear(_clampW(fromX - perpX, maxWX), _clampW(fromY - perpY, maxWY),
                             _clampW(toX - perpX, maxWX),   _clampW(toY - perpY, maxWY));

    _walkCache.set(key, ok);
    return ok;
}

function isProjectileBlockedByWall(px, py, tx, ty) {
    return !losCheck(px, py, tx, ty, 0x40);
}

const _WALL_BUFFER = 180;
const _WALL_BUFFER_LOOKAHEAD = 500;
const _ANTI_SUICIDE_WEIGHT = 200000;
const _ANTI_SUICIDE_THRESHOLD = 0.05;
const _SIDESTEP_SNIPER_SPEED = 3500;
const _SIDESTEP_WEIGHT = 1000;
const _PROJ_PAST_THRESHOLD = -200;
const _PERP_SKIP_MULT = 2.5;
const _MAX_TTH_BASE_S = 1.0;
const _MAX_TTH_SPEED_S = 0.000125;
const _SNIPER_LOCK_BONUS_MS = 60;
let _hasMassiveThreat = false;

function _tileBlocking(wx, wy) {
    if (!_wc) return false;
    const tx = (wx / 300) | 0;
    const ty = (wy / 300) | 0;
    if (tx < 0 || tx >= _wcW || ty < 0 || ty >= _wcH) return false;
    return (_wc[ty * _wcW + tx] & 0x80) !== 0;
}

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

function _scoreFor(p, mvx, mvy, mDirX, mDirY, myX, myY, myRadius, horizon) {
    if (p.losBlocked || p.ignored) return { score: Infinity, clearance: Infinity, ttc: Infinity };
    const haz = p.impactRadius || p.radius;
    const r = (myRadius + haz) * CONFIG.HITBOX_SCALE_OUFLOUKOS + CONFIG.SAFETY_MARGIN_BILUM_STRATUM;
    const lag = CONFIG.LAG_COMPENSATION_S_PROUTPROUT;
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
    return { score, clearance, ttc: tStar };
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
    if (prevDir) s += (dx * prevDir.x + dy * prevDir.y) * CONFIG.MOMENTUM_BILUM_STRATUM_STARFOULILOUM;

    if (_wc) {
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

const CONVERGENCE_BRAWLERS = new Set([
    'NANI',
]);

const DEFAULT_IGNORED_BRAWLERS = [
    'EL_PRIMO', 'MORTIS', 'ROSA', 'BIBI', 'JACKY', 'EDGAR', 'BUZZ',
    'FANG', 'SAM', 'HANK', 'DOUG', 'MICO', 'KIT', 'DRACO', 'LILY',
    'BULL', 'DARRYL', 'FRANK', 'ASH',
    'BARLEY', 'DYNAMIKE', 'TICK', 'SPROUT', 'GROM', 'WILLOW',
    'SQUEAK', 'JUJU',
    'POCO', 'EMZ',
    'SHADE', 'KAZE', 'ALLI', 'TRUNK', 'GIGI',
];

const _options = {
    activationDistance: 1500,
    reactionSpeed: 50,
    directionPrecision: 16,
    safetyMargin: 25,
};
let _ignoredBrawlersSet = new Set(DEFAULT_IGNORED_BRAWLERS);

function _applyReactionSpeed(v) {
    const t = Math.max(0, Math.min(100, v));
    const urgentMin = 0.25 + (t / 100) * 0.45;
    CONFIG.T_URGENT_MIN_GLOUBIBOULGA = urgentMin;
    CONFIG.T_URGENT_MAX_GLOUBIBOULGO = urgentMin + 0.25;
    _cachedUrgentWindowTs = 0;
}

function _applyDirectionPrecision(n) {
    const clean = Math.max(4, Math.min(64, n | 0));
    CONFIG.N_DIRECTIONS_FLOUMPFITOU = clean;
    CACHED_DIRECTIONS.length = 0;
    for (let i = 0; i < clean; i++) {
        const a = (Math.PI * 2 * i) / clean;
        CACHED_DIRECTIONS.push({ x: Math.cos(a), y: Math.sin(a) });
    }
}

export function setAutododgeOptions(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (typeof opts.activationDistance === 'number' && isFinite(opts.activationDistance)) {
        _options.activationDistance = Math.max(100, Math.min(5000, opts.activationDistance));
    }
    if (typeof opts.reactionSpeed === 'number' && isFinite(opts.reactionSpeed)) {
        _options.reactionSpeed = Math.max(0, Math.min(100, opts.reactionSpeed));
        _applyReactionSpeed(_options.reactionSpeed);
    }
    if (typeof opts.directionPrecision === 'number' && isFinite(opts.directionPrecision)) {
        _options.directionPrecision = Math.max(4, Math.min(64, opts.directionPrecision | 0));
        _applyDirectionPrecision(_options.directionPrecision);
    }
    if (typeof opts.safetyMargin === 'number' && isFinite(opts.safetyMargin)) {
        _options.safetyMargin = Math.max(0, Math.min(120, opts.safetyMargin));
        CONFIG.SAFETY_MARGIN_BILUM_STRATUM = _options.safetyMargin;
    }
    if (Array.isArray(opts.ignoredBrawlers)) {
        _ignoredBrawlersSet = new Set();
        for (const name of opts.ignoredBrawlers) {
            if (typeof name === 'string') _ignoredBrawlersSet.add(name.toUpperCase());
        }
    }
    _log('setAutododgeOptions applied', {
        activationDistance: _options.activationDistance,
        reactionSpeed: _options.reactionSpeed,
        directionPrecision: _options.directionPrecision,
        safetyMargin: _options.safetyMargin,
        ignoredCount: _ignoredBrawlersSet.size,
        T_URGENT_MIN: CONFIG.T_URGENT_MIN_GLOUBIBOULGA, T_URGENT_MAX: CONFIG.T_URGENT_MAX_GLOUBIBOULGO,
        N_DIRECTIONS: CONFIG.N_DIRECTIONS_FLOUMPFITOU,
    });
}

function _isIgnoredProjectile(brawlerName, isBeam) {
    if (isBeam) return true;
    return brawlerName ? _ignoredBrawlersSet.has(brawlerName) : false;
}

function resolveImpactRadius(radius, speed, ownerBrawlerId) {
    if (ownerBrawlerId) {
        const aoe = BRAWLER_AOE_IMPACT_RADIUS[ownerBrawlerId];
        if (aoe) return Math.max(radius, aoe);
    }
    if (radius > 0) {
        if (speed > 0 && speed < 1200 && radius < 120) return Math.min(220, radius * 2.25);
        return radius * 1.1;
    }
    if (speed <= 800) return 550;
    if (speed >= 1400 && speed <= 1600) return 350;
    return 220;
}

function inferProjectileOwner(x, y, enemies) {
    if (!enemies || enemies.length === 0) return null;
    let best = null;
    let bestD = PROJECTILE_OWNER_SNAP_DIST_SQ;
    for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        const dx = x - en.x, dy = y - en.y, d2 = dx * dx + dy * dy;
        if (d2 > bestD) continue;
        bestD = d2;
        best = en;
    }
    return best ? { brawlerId: best.brawlerId, brawlerName: best.brawlerName || null, x: best.x, y: best.y } : null;
}

function _initFromCtor(projPtr) {
    if (!projPtr || projPtr.isNull() || !_base || !_fns) return;
    try {
        if (scanData.lastUpdate > 0) {
            try {
                const team = projPtr.add(offsets.GameObj_team).readU32();
                if (team === scanData.myTeamId) return;
            } catch (_) {}
        }
        const data = _fns.LogicGameObjectClient_getData(projPtr);
        if (!data || data.isNull()) return;
        const vt = data.readPointer();
        if (!vt.equals(_base.add(offsets.VTABLE_PROJECTILE_DATA))) return;
        const gid = _fns.LogicGameObjectClient_getGlobalID(projPtr).toString();
        if (projectiles.has(gid)) return;

        const speed = _fns.LogicProjectileData_getSpeed(data) || 1200;
        const radius = _fns.LogicProjectileData_getRadius(data) || 8;
        const sx = _fns.LogicGameObjectClient_getX(projPtr) | 0;
        const sy = _fns.LogicGameObjectClient_getY(projPtr) | 0;

        const owner = inferProjectileOwner(sx, sy, scanData.enemies);
        const ownerBrawlerId = owner ? owner.brawlerId : 0;
        const ownerName = owner ? (owner.brawlerName || null) : null;

        let dirX = 0, dirY = 0, unconfirmed = true;
        try {
            const rawAng = projPtr.add(offsets.Projectile_spawnAngle).readFloat();
            if (isFinite(rawAng) && rawAng !== 0.0) {
                dirX = Math.cos(rawAng);
                dirY = Math.sin(rawAng);
                unconfirmed = false;
            }
        } catch (_) {}
        if (unconfirmed && owner) {
            const ddx = sx - owner.x;
            const ddy = sy - owner.y;
            const len = Math.sqrt(ddx * ddx + ddy * ddy);
            if (len > 1) { dirX = ddx / len; dirY = ddy / len; unconfirmed = false; }
        }

        let isBeam = false;
        try { if (_isBeamFn) isBeam = !!_isBeamFn(data); } catch (_) {}

        const ignoredType = _isIgnoredProjectile(ownerName, isBeam);

        const now = Date.now();
        projectiles.set(gid, {
            addr: projPtr,
            gid: gid,
            x: sx, y: sy,
            dirX: dirX, dirY: dirY,
            speed: speed, radius: radius,
            impactRadius: resolveImpactRadius(radius, speed, ownerBrawlerId),
            lastX: sx, lastY: sy, lastSeen: now, staleFrames: 0,
            unconfirmed: unconfirmed,
            ownerBrawlerId: ownerBrawlerId,
            ownerBrawlerName: ownerName,
            ownerLocked: !!owner,
            ignored: ignoredType,
            losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
            losProjTileX: -9999, losProjTileY: -9999,
        });
    } catch (_) {}
}

function _createFromScan(sp, now) {
    const owner = inferProjectileOwner(sp.x, sp.y, scanData.enemies);
    const ownerBrawlerId = owner ? owner.brawlerId : 0;
    const ownerName = owner ? (owner.brawlerName || null) : null;

    let dirX = 0, dirY = 0, unconfirmed = true;
    const ang = sp.spawnAngle;
    if (ang !== null && ang !== undefined && isFinite(ang) && ang !== 0.0) {
        dirX = Math.cos(ang);
        dirY = Math.sin(ang);
        unconfirmed = false;
    }
    if (unconfirmed && owner) {
        const ddx = sp.x - owner.x;
        const ddy = sp.y - owner.y;
        const len = Math.sqrt(ddx * ddx + ddy * ddy);
        if (len > 1) {
            dirX = ddx / len;
            dirY = ddy / len;
            unconfirmed = false;
        }
    }

    const ignoredType = _isIgnoredProjectile(ownerName, !!sp.isBeam);

    projectiles.set(sp.gid, {
        gid: sp.gid,
        x: sp.x, y: sp.y,
        dirX: dirX, dirY: dirY,
        speed: sp.speed, radius: sp.radius,
        impactRadius: resolveImpactRadius(sp.radius, sp.speed, ownerBrawlerId),
        lastX: sp.x, lastY: sp.y, lastSeen: now,
        unconfirmed: unconfirmed,
        ownerBrawlerId: ownerBrawlerId,
        ownerBrawlerName: ownerName,
        ownerLocked: !!owner,
        ignored: ignoredType,
        losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
        losProjTileX: -9999, losProjTileY: -9999,
    });
}

function syncProjectiles(now) {
    if (now === _lastSyncTime) return;
    _lastSyncTime = now;
    const charX = scanData.myX, charY = scanData.myY;
    const maxD2 = CONFIG.MAX_TRACK_DIST_GRIBOULZINON * CONFIG.MAX_TRACK_DIST_GRIBOULZINON;
    const staleMax = CONFIG.STALE_FRAMES_MAX_DROUBLOUKAZ;

    let scanByGid = null;
    const enemies = scanData.enemies;
    for (let i = 0; i < enemies.length; i++) {
        if (CONVERGENCE_BRAWLERS.has(enemies[i].brawlerName)) {
            const scanProj = scanData.projectiles;
            scanByGid = new Map();
            for (let j = 0; j < scanProj.length; j++) scanByGid.set(scanProj[j].gid, scanProj[j]);
            break;
        }
    }

    for (const [gid, pr] of projectiles) {
        let nx, ny, spRef = null;
        if (pr.addr) {
            try {
                nx = _fns.LogicGameObjectClient_getX(pr.addr) | 0;
                ny = _fns.LogicGameObjectClient_getY(pr.addr) | 0;
            } catch (_) {
                projectiles.delete(gid);
                continue;
            }
        } else if (scanByGid) {
            spRef = scanByGid.get(gid);
            if (!spRef) {
                if (now - pr.lastSeen > CONFIG.STALE_MS_KROUMBLATImir) projectiles.delete(gid);
                continue;
            }
            nx = spRef.x; ny = spRef.y;
        } else {
            if (now - pr.lastSeen > CONFIG.STALE_MS_KROUMBLATImir) projectiles.delete(gid);
            continue;
        }

        const ddx = nx - charX, ddy = ny - charY;
        if (ddx * ddx + ddy * ddy > maxD2) {
            projectiles.delete(gid);
            continue;
        }

        const dx = nx - pr.lastX, dy = ny - pr.lastY;
        const moved2 = dx * dx + dy * dy;
        if (moved2 < 25) {
            if (pr.addr) {
                pr.staleFrames++;
                if (pr.staleFrames > staleMax) {
                    projectiles.delete(gid);
                    continue;
                }
            }
        } else {
            if (pr.addr) pr.staleFrames = 0;
            const inv = 1 / Math.sqrt(moved2);
            pr.dirX = dx * inv;
            pr.dirY = dy * inv;
            pr.unconfirmed = false;
            if (!pr.ownerLocked) {
                const owner = inferProjectileOwner(nx, ny, enemies);
                if (owner) {
                    pr.ownerLocked = true;
                    pr.ownerBrawlerId = owner.brawlerId;
                    pr.ownerBrawlerName = owner.brawlerName || null;
                    const sRad = spRef ? spRef.radius : pr.radius;
                    const sSpd = spRef ? spRef.speed : pr.speed;
                    pr.impactRadius = resolveImpactRadius(sRad, sSpd, owner.brawlerId);
                    pr.ignored = _isIgnoredProjectile(pr.ownerBrawlerName, spRef ? !!spRef.isBeam : false);
                }
            }
        }
        pr.x = nx; pr.y = ny;
        pr.lastX = nx; pr.lastY = ny;
        pr.lastSeen = now;
    }

    if (scanByGid) {
        for (const sp of scanByGid.values()) {
            if (projectiles.has(sp.gid)) continue;
            const ddx = sp.x - charX, ddy = sp.y - charY;
            if (ddx * ddx + ddy * ddy > maxD2) continue;
            _createFromScan(sp, now);
        }
    }
}

function buildActiveList(myX, myY, myRadius, tileX, tileY) {
    _activeProjs.length = 0;
    _maxProjSpeed = 0;
    _hasMassiveThreat = false;
    const baseAct = _options.activationDistance;
    const leadS = CONFIG.ACTIVATION_LEAD_S_FROUMBAXOR;
    const maxTrack = CONFIG.MAX_TRACK_DIST_GRIBOULZINON;
    for (const p of projectiles.values()) {
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
        let eff = p.speed * leadS;
        if (eff < baseAct) eff = baseAct;
        else if (eff > maxTrack) eff = maxTrack;
        const actMaxSq = eff * eff;
        const ddx = p.x - myX;
        const ddy = p.y - myY;
        const distSq = ddx * ddx + ddy * ddy;
        if (distSq > actMaxSq) continue;

        const haz = p.impactRadius || p.radius;
        const isSlow = (p.speed <= 800);

        if (!p.ignored && !p.losBlocked && !isSlow) {
            if (_tileBlocking(p.x, p.y)) {
                p._urgency = 0;
                continue;
            }
            const dx = myX - p.x;
            const dy = myY - p.y;
            const dotToPlayer = dx * p.dirX + dy * p.dirY;
            if (dotToPlayer < _PROJ_PAST_THRESHOLD) {
                p._urgency = 0;
                continue;
            }
            const projection = dotToPlayer < 0 ? 0 : (dotToPlayer > 8000 ? 8000 : dotToPlayer);
            const closestX = p.x + p.dirX * projection;
            const closestY = p.y + p.dirY * projection;
            const dclX = myX - closestX;
            const dclY = myY - closestY;
            const perpDist = Math.sqrt(dclX * dclX + dclY * dclY);
            const dynamicBuffer = haz * (1.1 + p.speed * 0.0002);
            if (perpDist > dynamicBuffer * _PERP_SKIP_MULT) {
                p._urgency = 0;
                continue;
            }
            const rawDist = Math.sqrt(distSq);
            const timeToHit = rawDist / (p.speed < 1 ? 1 : p.speed);
            if (timeToHit > _MAX_TTH_BASE_S + p.speed * _MAX_TTH_SPEED_S) {
                p._urgency = 0;
                continue;
            }
            p._urgency = _computeUrgencyTier(timeToHit, rawDist, perpDist, haz);
            if (haz > 380) _hasMassiveThreat = true;
        } else {
            p._urgency = 0;
        }

        if (!p.ignored && p.speed > _maxProjSpeed) _maxProjSpeed = p.speed;
        _activeProjs.push(p);
    }
}

export function updateAutododge() {
    if (!state.autododge) return;
    _checkInitDirections();
    if (scanData.lastUpdate === 0) return;

    const now = Date.now();

    const myX = scanData.myX, myY = scanData.myY;
    const myRadius = scanData.myRadius || 60;

    _wc = getWallCache();
    _wcW = getWallCacheW();
    _wcH = getWallCacheH();

    const gen = getWallCacheGen();
    if (gen !== _wcGen) {
        _walkCache.clear();
        _walkCacheTileX = -9999;
        for (const p of projectiles.values()) p.losMyTileX = -9999;
        _wcGen = gen;
    }

    const tileX = (myX / 300) | 0;
    const tileY = (myY / 300) | 0;
    if (tileX !== _walkCacheTileX || tileY !== _walkCacheTileY) {
        _walkCache.clear();
        _walkCacheTileX = tileX;
        _walkCacheTileY = tileY;
    }

    CONFIG.CHAR_SPEED_VROUMBOLOS = scanData.mySpeed;
    syncProjectiles(now);
    buildActiveList(myX, myY, myRadius, tileX, tileY);

    if (_hasMassiveThreat) {
        _tickLog('massive AoE incoming, releasing dodge');
        _dodgeDir = null;
        g_dodgeUntil = 0;
        return;
    }

    const charSpeed = CONFIG.CHAR_SPEED_VROUMBOLOS || 720;
    const prevDir = _dodgeDir;

    const picked = _pickBestDir(myX, myY, myRadius, charSpeed, prevDir);
    const stayCl = picked.stayClearance;
    const stayTtc = picked.stayTtc;
    const bestScore = picked.score;
    const bestCl = picked.clearance;
    const bestTtc = picked.ttc;
    const mustDodge = prevDir !== null ? (stayCl < CONFIG.DODGE_EXIT_CLEARANCE_FROUMOUSTAR) : (stayCl < 0);

    if (isLoggingEnabled()) {
        _tickLog('upd', {
            projMap: projectiles.size,
            activeProjs: _activeProjs.length,
            horizon: picked.horizon.toFixed(3),
            stayCl: (stayCl === Infinity ? 'inf' : stayCl.toFixed(0)),
            stayTtc: (stayTtc === Infinity ? 'inf' : stayTtc.toFixed(3)),
            bestCl: (bestCl === Infinity ? 'inf' : bestCl.toFixed(0)),
            bestTtc: (bestTtc === Infinity ? 'inf' : bestTtc.toFixed(3)),
            bestDir: picked.dir ? `(${picked.dir.x.toFixed(2)},${picked.dir.y.toFixed(2)})` : null,
            mustDodge,
            prevDir: prevDir ? `(${prevDir.x.toFixed(2)},${prevDir.y.toFixed(2)})` : null,
            commitMsLeft: prevDir ? Math.max(0, g_dodgeUntil - now) : 0,
        });
    }

    if (!mustDodge) {
        if (prevDir && (now - _lastThreatTs) < CONFIG.RELEASE_GRACE_MS_PLOUKAZ
            && isDirectionWalkable(myX, myY, prevDir.x, prevDir.y, myRadius)) {
            _dodgeDir = prevDir;
            return;
        }
        if (prevDir) _log('release (stayCl>=0)', { stayCl: stayCl === Infinity ? 'inf' : stayCl.toFixed(0) });
        _dodgeDir = null;
        return;
    }

    _lastThreatTs = now;

    if (!picked.dir) {
        if (prevDir) _log('release (no walkable better than stay)', { stayCl: stayCl.toFixed(0) });
        _dodgeDir = null;
        return;
    }

    let safeDir = picked.dir;
    const desperate = bestCl < 0;

    if (prevDir && isDirectionWalkable(myX, myY, prevDir.x, prevDir.y, myRadius)) {
        const prevM = _minScore(prevDir.x, prevDir.y, charSpeed, myX, myY, myRadius, picked.horizon);
        if (prevM.clearance >= 0) {
            safeDir = prevDir;
        } else if (desperate) {
            if (prevM.clearance >= bestCl - CONFIG.DESPERATE_KEEP_BAND_GLOUMRAKOS) safeDir = prevDir;
        } else if (now < g_dodgeUntil && prevM.clearance >= bestCl - CONFIG.COMMIT_KEEP_BAND_WOULOUKOS) {
            safeDir = prevDir;
        }
    }

    if (prevDir && now < g_dodgeUntil) {
        const ddx = myX - _lockOriginX;
        const ddy = myY - _lockOriginY;
        const dmax = CONFIG.LOCK_DRIFT_MAX_SCHMOULBIDOU;
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
        g_dodgeUntil = now + CONFIG.DODGE_COMMIT_MS_BOULGAZOR + (urgentSniper ? _SNIPER_LOCK_BONUS_MS : 0);
        _lockOriginX = myX;
        _lockOriginY = myY;
        if (isLoggingEnabled()) {
            _log('dodge commit', {
                dir: `(${safeDir.x.toFixed(2)},${safeDir.y.toFixed(2)})`,
                score: bestScore === Infinity ? 'inf' : bestScore.toFixed(0),
                cl: bestCl === Infinity ? 'inf' : bestCl.toFixed(0),
                ttc: bestTtc === Infinity ? 'inf' : bestTtc.toFixed(3),
                stayCl: stayCl === Infinity ? 'inf' : stayCl.toFixed(0),
                desp: desperate,
            });
        }
    }
}

export function setupAutododge(base) {
    _base = base;
    _fns = getFunctions();
    _checkInitDirections();
    _log('setupAutododge: base=' + base.toString());

    try {
        _isBeamFn = new NativeFunction(base.add(offsets.LogicProjectileData__isBeam), 'bool', ['pointer']);
        _log('setup: _isBeamFn OK');
    } catch (e) {
        _isBeamFn = null;
        _log('setup: _isBeamFn FAILED: ' + (e && e.message));
    }

    try {
        Interceptor.attach(base.add(offsets.Projectile_ctor), {
            onEnter: function (args) { this._proj = args[1]; },
            onLeave: function () { _initFromCtor(this._proj); }
        });
        _log('setup: Projectile_ctor hook attached');
    } catch (e) {
        _log('setup: Projectile_ctor hook FAILED: ' + (e && e.message));
    }

    try {
        Interceptor.attach(base.add(offsets.BattleScreen__updateMovement), {
            onEnter: function (args) {
                let tx, ty;

                if (state.autododge && _dodgeDir) {
                    const d = _dodgeDir;
                    if (!isFinite(d.x) || !isFinite(d.y)) return;
                    tx = Math.round(scanData.myX + d.x * 500);
                    ty = Math.round(scanData.myY + d.y * 500);
                    if (_wcW > 0) {
                        tx = _clampW(tx, _wcW * 300 - 1);
                        ty = _clampW(ty, _wcH * 300 - 1);
                    }
                } else if (state.spinner) {
                    _spinPhase += SPIN_STEP;
                    if (_spinPhase >= Math.PI * 2) _spinPhase -= Math.PI * 2;
                    tx = Math.round(scanData.myX + Math.cos(_spinPhase) * SPIN_RADIUS);
                    ty = Math.round(scanData.myY + Math.sin(_spinPhase) * SPIN_RADIUS);
                } else {
                    return;
                }

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
                    ci.add(offsets.ClientInput_x).writeS32(tx);
                    ci.add(offsets.ClientInput_y).writeS32(ty);
                    fns.ClientInputManager_addInput(manager, ci);
                } catch (_) {}
            }
        });
    } catch (_) {}
}
