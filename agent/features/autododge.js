import { losCheck, getWallCache, getWallCacheW, getWallCacheH } from "../utils/wallCache.js";
import { getFunctions } from "../core/functions.js";
import { offsets } from "../core/offsets.js";
import { getLibc } from "../utils/utils.js";
import { state } from "../utils/flags.js";
import { scanData } from "../core/scanner.js";
import { CONFIG } from "../utils/config.js";

const _MAX_DIRS = 16;
const _MAX_BATCH = 40;
const _cachedScores = new Float32Array(_MAX_DIRS);
const _batchScores = new Float32Array(_MAX_BATCH);
let _cacheValid = false;
const _burstCandidates = new Array(64);
for (let _i = 0; _i < 64; _i++) _burstCandidates[_i] = { x: 0, y: 0 };
const _burstGroupIds = new Int32Array(128);
const _burstGroupReps = new Int32Array(128);

const BRAWLER_AOE_IMPACT_RADIUS = {
    6: 220, 9: 240, 22: 260, 37: 240, 40: 180, 48: 220, 82: 200,
};
const PROJECTILE_OWNER_SNAP_DIST_SQ = 1500 * 1500;
const BURST_WINDOW_MS = 200;
const URGENT_WINDOW_CACHE_MS = 250;

const SPIN_RADIUS = 25;
const SPIN_STEP = Math.PI / 4;

const projectiles = new Map();
let lastSafeDir = null;
let lastSafeDirTime = 0;
let g_dodgeUntil = 0;
let _dodgeDir = null;
let _lockOriginX = 0;
let _lockOriginY = 0;
let _spinPhase = 0;
let _lastSyncTime = 0;

const _walkCache = new Map();
let _walkCacheTileX = -9999;
let _walkCacheTileY = -9999;
let _cachedUrgentWindow = 0.9;
let _cachedUrgentWindowTs = 0;

const _activeProjs = [];
let _maxProjSpeed = 0;
let _wc = null, _wcW = 0, _wcH = 0;
const _voCache = new Float32Array(16);
let _voCacheValid = 0;

let _base = null;
let _fns = null;
let _isBeamFn = null;

const CACHED_DIRECTIONS = [];
function _checkInitDirections() {
    if (CACHED_DIRECTIONS.length === 0 && CONFIG.N_DIRECTIONS > 0) {
        for (let i = 0; i < CONFIG.N_DIRECTIONS; i++) {
            const a = (Math.PI * 2 * i) / CONFIG.N_DIRECTIONS;
            CACHED_DIRECTIONS.push({ x: Math.cos(a), y: Math.sin(a) });
        }
    }
}

export function getDodgeDir() { return _dodgeDir; }

export function resetAutododge() {
    projectiles.clear();
    _activeProjs.length = 0;
    _dodgeDir = null;
    g_dodgeUntil = 0;
    _lockOriginX = 0;
    _lockOriginY = 0;
    lastSafeDir = null;
    lastSafeDirTime = 0;
    _walkCache.clear();
    _walkCacheTileX = -9999;
    _walkCacheTileY = -9999;
    _cachedUrgentWindowTs = 0;
    _voCacheValid = 0;
    _spinPhase = 0;
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len < 1e-6) return { x: 1, y: 0 };
    return { x: x / len, y: y / len };
}

function getUrgentWindow() {
    const now = Date.now();
    if (now - _cachedUrgentWindowTs < URGENT_WINDOW_CACHE_MS) return _cachedUrgentWindow;
    const speed = Math.max(420, Math.min(900, CONFIG.CHAR_SPEED || 720));
    const norm = (speed - 420) / 480;
    let base = CONFIG.T_URGENT_MIN + (1 - norm) * (CONFIG.T_URGENT_MAX - CONFIG.T_URGENT_MIN);
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

function directionDot(a, b) {
    if (!a || !b) return 0;
    return a.x * b.x + a.y * b.y;
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
        if (cx === tx1 && cy === ty1) return true;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return false;
        if (_wc[cy * w + cx] & 0x80) return false;
    }
    return true;
}

function isDirectionWalkable(fromX, fromY, dirX, dirY, charRadius) {
    const key = ((fromX / 300) | 0) * 1000000 + ((fromY / 300) | 0) * 1000 + ((dirX * 8) | 0) * 32 + ((dirY * 8) | 0);
    const cached = _walkCache.get(key);
    if (cached !== undefined) return cached;
    if (!_wc) { _walkCache.set(key, true); return true; }

    let probeD = CONFIG.CHAR_SPEED * CONFIG.PROBE_TIME_S;
    if (probeD < CONFIG.PROBE_MIN) probeD = CONFIG.PROBE_MIN;
    else if (probeD > CONFIG.PROBE_MAX) probeD = CONFIG.PROBE_MAX;
    const toX = fromX + dirX * probeD;
    const toY = fromY + dirY * probeD;
    const pr = charRadius * 0.9;
    const perpX = -dirY * pr;
    const perpY = dirX * pr;

    const ok = _walkRayClear(fromX,         fromY,         toX,         toY)
            && _walkRayClear(fromX + perpX, fromY + perpY, toX + perpX, toY + perpY)
            && _walkRayClear(fromX - perpX, fromY - perpY, toX - perpX, toY - perpY);

    _walkCache.set(key, ok);
    return ok;
}

function isProjectileBlockedByWall(px, py, tx, ty) {
    return !losCheck(px, py, tx, ty, 0x40);
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

    const n = _activeProjs.length;
    if (n === 0) return null;

    const cap = n > 128 ? 128 : n;
    const ix = sIntent.x * CONFIG.INTENT_WEIGHT;
    const iy = sIntent.y * CONFIG.INTENT_WEIGHT;
    const perpW = CONFIG.PERP_WEIGHT;
    const awayW = CONFIG.AWAY_WEIGHT;
    const maxOut = cap * 2 > _burstCandidates.length ? _burstCandidates.length : cap * 2;

    let numGroups = 0;
    for (let i = 0; i < cap; i++) {
        const p = _activeProjs[i];
        const urgent = isUrgentThreat(p, myX, myY, myRadius, movingDir);
        if (!urgent) { _burstGroupIds[i] = -1; continue; }
        let found = -1;
        for (let g = 0; g < numGroups; g++) {
            const ri = _burstGroupReps[g];
            const r = _activeProjs[ri];
            let match = false;
            if (p.ownerLocked && r.ownerLocked) {
                if (p.ownerBrawlerId === r.ownerBrawlerId
                    && ((p.spawnTime / BURST_WINDOW_MS) | 0) === ((r.spawnTime / BURST_WINDOW_MS) | 0)) match = true;
            } else if (p.gid === r.gid) match = true;
            if (match) { found = g; break; }
        }
        if (found === -1) {
            if (numGroups < 128) {
                _burstGroupReps[numGroups] = i;
                _burstGroupIds[i] = numGroups;
                numGroups++;
            } else _burstGroupIds[i] = -1;
        } else _burstGroupIds[i] = found;
    }

    let count = 0;
    for (let g = 0; g < numGroups; g++) {
        let adx = 0, ady = 0, ax = 0, ay = 0, cnt = 0;
        for (let i = 0; i < cap; i++) {
            if (_burstGroupIds[i] !== g) continue;
            const p = _activeProjs[i];
            adx += p.dirX; ady += p.dirY; ax += p.x; ay += p.y; cnt++;
        }
        if (cnt === 0) continue;
        adx /= cnt; ady /= cnt; ax /= cnt; ay /= cnt;
        const awx0 = myX - ax, awy0 = myY - ay;
        const awL = Math.sqrt(awx0 * awx0 + awy0 * awy0);
        const awX = awL < 1e-6 ? 1 : awx0 / awL;
        const awY = awL < 1e-6 ? 0 : awy0 / awL;
        const p1L = Math.sqrt(ady * ady + adx * adx);
        const p1x = p1L < 1e-6 ? 1 : -ady / p1L;
        const p1y = p1L < 1e-6 ? 0 :  adx / p1L;
        const p2x = -p1x, p2y = -p1y;
        const c1x = p1x * perpW + awX * awayW + ix;
        const c1y = p1y * perpW + awY * awayW + iy;
        const c1L = Math.sqrt(c1x * c1x + c1y * c1y);
        const c2x = p2x * perpW + awX * awayW + ix;
        const c2y = p2y * perpW + awY * awayW + iy;
        const c2L = Math.sqrt(c2x * c2x + c2y * c2y);
        if (count < maxOut) {
            const c = _burstCandidates[count++];
            c.x = c1L < 1e-6 ? 1 : c1x / c1L;
            c.y = c1L < 1e-6 ? 0 : c1y / c1L;
        }
        if (count < maxOut) {
            const c = _burstCandidates[count++];
            c.x = c2L < 1e-6 ? 1 : c2x / c2L;
            c.y = c2L < 1e-6 ? 0 : c2y / c2L;
        }
    }

    if (count <= 0) return null;
    const candidates = count === _burstCandidates.length ? _burstCandidates : _burstCandidates.slice(0, count);

    let bestDir = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const useCached = _cacheValid && sIntent.x === 0 && sIntent.y === 0;

    if (candidates.length > 0) {
        const nBatch = _scoreBatchInto(candidates, myX, myY, myRadius, sIntent, _batchScores);
        for (let i = 0; i < nBatch; i++) {
            const s = _batchScores[i];
            if (s < bestScore) { bestScore = s; bestDir = candidates[i]; }
        }
    }

    if (useCached) {
        for (let i = 0; i < CACHED_DIRECTIONS.length; i++) {
            const s = _cachedScores[i];
            if (Number.isFinite(s) && s < bestScore) {
                bestScore = s;
                bestDir = CACHED_DIRECTIONS[i];
            }
        }
    } else {
        const n2 = _scoreBatchInto(CACHED_DIRECTIONS, myX, myY, myRadius, sIntent, _batchScores);
        for (let i = 0; i < n2; i++) {
            const s = _batchScores[i];
            if (s < bestScore) { bestScore = s; bestDir = CACHED_DIRECTIONS[i]; }
        }
    }

    if (bestDir === null) return null;
    return { dir: bestDir };
}

function _effectiveMinClearance(myRadius) {
    const v = myRadius * CONFIG.MIN_CLEARANCE_RADIUS_FACTOR;
    return v > CONFIG.MIN_CLEARANCE ? v : CONFIG.MIN_CLEARANCE;
}

function _effectiveMovingMargin() {
    const over = _maxProjSpeed - CONFIG.MARGIN_FAST_PROJ_THRESHOLD;
    if (over <= 0) return CONFIG.MOVING_EXTRA_MARGIN;
    let bonus = over * CONFIG.MARGIN_FAST_PROJ_GAIN;
    if (bonus > CONFIG.MARGIN_FAST_PROJ_CAP) bonus = CONFIG.MARGIN_FAST_PROJ_CAP;
    return CONFIG.MOVING_EXTRA_MARGIN + bonus;
}

function _cornerPenalty(dirX, dirY, myX, myY) {
    if (!_wc) return 0;
    const w = _wcW, h = _wcH;
    const cx = ((myX + dirX * 360) / 300) | 0;
    const cy = ((myY + dirY * 360) / 300) | 0;
    if (cx <= 0 || cx >= w - 1 || cy <= 0 || cy >= h - 1) return 0;
    let walls = 0;
    if (_wc[cy * w + (cx - 1)] & 0x80) walls++;
    if (_wc[cy * w + (cx + 1)] & 0x80) walls++;
    if (_wc[(cy - 1) * w + cx] & 0x80) walls++;
    if (_wc[(cy + 1) * w + cx] & 0x80) walls++;
    if (walls < 2) return 0;
    return (walls - 1) * CONFIG.CORNER_WALL_PENALTY;
}

function _thrSingle(
    dirX, dirY,
    myX, myY, myRadius,
    tField, minClear, charSpeed,
    lag, safety, moveExtra,
    intentX, intentY, intentW,
    lsAlive, lsDx, lsDy, lsFactor,
    unwalkable
) {
    let score = 0;
    let closest = -1;

    if (unwalkable) score += 1e12;

    const dirVx = dirX * charSpeed;
    const dirVy = dirY * charSpeed;
    const minClSq = minClear * minClear;
    const isMoving = (dirX !== 0 || dirY !== 0) ? 1 : 0;
    const moveOver = isMoving ? moveExtra : 0;

    const projs = _activeProjs;
    const n = projs.length;

    for (let i = 0; i < n; i++) {
        const p = projs[i];
        if (p.ignored) continue;

        let tImpact = -1;
        if (!p.losBlocked) {
            const haz = p.impactRadius || p.radius;
            const rTt = myRadius + haz + safety + moveOver;
            const px0 = p.x + p._svx * lag;
            const py0 = p.y + p._svy * lag;
            const ddx = px0 - myX;
            const ddy = py0 - myY;
            const rTtSq = rTt * rTt;
            const ddSq = ddx * ddx + ddy * ddy;
            if (ddSq <= rTtSq) tImpact = 0;
            else {
                const rvx = p._svx - dirVx;
                const rvy = p._svy - dirVy;
                const a = rvx * rvx + rvy * rvy;
                if (a >= 1e-6) {
                    const b = 2 * (ddx * rvx + ddy * rvy);
                    const c = ddSq - rTtSq;
                    const disc = b * b - 4 * a * c;
                    if (disc >= 0) {
                        const sq = Math.sqrt(disc);
                        const t1 = (-b - sq) / (2 * a);
                        const t2 = (-b + sq) / (2 * a);
                        if (t2 >= 0) {
                            const t = t1 >= 0 ? t1 : 0;
                            if (t <= tField) tImpact = t;
                        }
                    }
                }
            }
        }

        if (tImpact >= 0) {
            if (closest < 0 || tImpact < closest) closest = tImpact;
            score += 40000000 + (tField - tImpact) * 40000000;
            if (tImpact <= 0.12) {
                const awX = myX - p.x;
                const awY = myY - p.y;
                let awL = Math.sqrt(awX * awX + awY * awY);
                if (awL === 0) awL = 1;
                const ha = (dirX * awX + dirY * awY) / awL;
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
            const disc = b * b - 4 * a * (c - rSq);
            if (disc < 0) continue;
        }
        let minD2 = c;
        let tMinInf = 0;
        if (a > 1e-6) {
            const tMin = -b / (2 * a);
            tMinInf = tMin;
            if (tMin > 0 && tMin <= tField)      minD2 = c + b * tMin + a * tMin * tMin;
            else if (tMin > tField)              minD2 = c + b * tField + a * tField * tField;
        }
        let danger = 0;
        if (minD2 < rSq) {
            danger = 20000000 + (rSq - minD2) * 1000;
        } else {
            const cl = Math.sqrt(minD2) - r;
            if (cl < minClear) {
                const gap = minClear - cl;
                danger = (gap * gap * 500) / minClSq;
            }
            let denom = minD2 - rSq;
            if (denom < 1) denom = 1;
            let prox = (rSq * 200) / denom;
            if (prox > 100000) prox = 100000;
            danger += prox;
            if (tMinInf > tField) {
                const minD2Inf = c + b * tMinInf + a * tMinInf * tMinInf;
                if (minD2Inf < rSq) danger += 2000000;
            }
        }
        const bSpeed = p.speed;
        if (bSpeed > 1) {
            const inv = 1 / bSpeed;
            const dotB = dirX * (p._svx * inv) + dirY * (p._svy * inv);
            if (dotB > 0) {
                const ir = p.impactRadius || p.radius;
                danger += dotB * ir * 200;
            }
        }
        score += danger;
    }

    if (intentX !== 0 || intentY !== 0) {
        const dot = dirX * intentX + dirY * intentY;
        score -= dot * intentW * 30;
    }
    if (lsAlive) {
        const di = dirX * lsDx + dirY * lsDy;
        let f = closest < 0 ? 1 : closest * lsFactor;
        if (f < 0.15) f = 0.15;
        if (f > 1)    f = 1;
        score -= di * 10 * f;
    }
    return { score, closest };
}

function _batchParams(myX, myY, myRadius) {
    const lsAlive = (lastSafeDir && (Date.now() - lastSafeDirTime < 80)) ? 1 : 0;
    return {
        tField:    CONFIG.T_FIELD,
        minClear:  _effectiveMinClearance(myRadius),
        charSpeed: CONFIG.CHAR_SPEED,
        lag:       CONFIG.LAG_COMPENSATION_S,
        safety:    CONFIG.SAFETY_MARGIN,
        moveExtra: _effectiveMovingMargin(),
        intentW:   CONFIG.INTENT_WEIGHT,
        lsAlive,
        lsDx:      lsAlive ? lastSafeDir.x : 0,
        lsDy:      lsAlive ? lastSafeDir.y : 0,
        lsFactor:  1 / Math.max(getUrgentWindow(), 0.01),
    };
}

function _scoreBatchInto(candidates, myX, myY, myRadius, intentDir, outScores) {
    const n = candidates.length;
    if (n === 0) return 0;
    const cap = n > _MAX_BATCH ? _MAX_BATCH : n;
    const p = _batchParams(myX, myY, myRadius);
    for (let i = 0; i < cap; i++) {
        const d = candidates[i];
        const unwalk = isDirectionWalkable(myX, myY, d.x, d.y, myRadius) ? 0 : 1;
        const r = _thrSingle(
            d.x, d.y, myX, myY, myRadius,
            p.tField, p.minClear, p.charSpeed,
            p.lag, p.safety, p.moveExtra,
            intentDir.x, intentDir.y, p.intentW,
            p.lsAlive, p.lsDx, p.lsDy, p.lsFactor,
            unwalk
        );
        outScores[i] = Number.isFinite(r.score)
            ? r.score + _cornerPenalty(d.x, d.y, myX, myY)
            : Number.POSITIVE_INFINITY;
    }
    return cap;
}

function _precomputeCachedDirScores(myX, myY, myRadius, intentDir) {
    const n = CACHED_DIRECTIONS.length;
    const p = _batchParams(myX, myY, myRadius);
    let allBad = true;
    for (let i = 0; i < n; i++) {
        const d = CACHED_DIRECTIONS[i];
        const unwalk = isDirectionWalkable(myX, myY, d.x, d.y, myRadius) ? 0 : 1;
        const r = _thrSingle(
            d.x, d.y, myX, myY, myRadius,
            p.tField, p.minClear, p.charSpeed,
            p.lag, p.safety, p.moveExtra,
            intentDir.x, intentDir.y, p.intentW,
            p.lsAlive, p.lsDx, p.lsDy, p.lsFactor,
            unwalk
        );
        let v = r.score;
        if (Number.isFinite(v)) {
            v += _cornerPenalty(d.x, d.y, myX, myY);
            allBad = false;
        }
        _cachedScores[i] = v;
    }
    _cacheValid = !allBad;
}

function threatScore(dir, myX, myY, myRadius, intentDir) {
    const unwalk = isDirectionWalkable(myX, myY, dir.x, dir.y, myRadius) ? 0 : 1;
    const p = _batchParams(myX, myY, myRadius);
    const r = _thrSingle(
        dir.x, dir.y, myX, myY, myRadius,
        p.tField, p.minClear, p.charSpeed,
        p.lag, p.safety, p.moveExtra,
        intentDir.x, intentDir.y, p.intentW,
        p.lsAlive, p.lsDx, p.lsDy, p.lsFactor,
        unwalk
    );
    const s = r.score;
    if (!Number.isFinite(s)) return Number.POSITIVE_INFINITY;
    return s + _cornerPenalty(dir.x, dir.y, myX, myY);
}

const _spiralBuf = new Array(32);
for (let _i = 0; _i < 32; _i++) _spiralBuf[_i] = { x: 0, y: 0 };

function spiralSearch(myX, myY, myRadius, intentDir) {
    let cx = 0, cy = 0, n = 0;
    const m = _activeProjs.length;
    for (let i = 0; i < m; i++) {
        const p = _activeProjs[i];
        if (p.ignored) continue;
        cx += p.x; cy += p.y; n++;
    }
    if (n === 0) return null;
    cx /= n; cy /= n;
    const awX = myX - cx, awY = myY - cy;
    if (awX * awX + awY * awY < 1e-6) return null;
    const baseAngle = Math.atan2(awY, awX);
    const SAMPLES = CONFIG.SPIRAL_SAMPLES;
    const STEP = Math.PI / SAMPLES;
    const cap = SAMPLES > _spiralBuf.length ? _spiralBuf.length : SAMPLES;
    for (let i = 0; i < cap; i++) {
        const half = (i + 1) >> 1;
        const sign = (i & 1) ? -1 : 1;
        const angle = baseAngle + sign * half * STEP;
        const d = _spiralBuf[i];
        d.x = Math.cos(angle);
        d.y = Math.sin(angle);
    }
    const arr = cap === _spiralBuf.length ? _spiralBuf : _spiralBuf.slice(0, cap);
    const got = _scoreBatchInto(arr, myX, myY, myRadius, intentDir, _batchScores);
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < got; i++) {
        const s = _batchScores[i];
        if (s < bestScore) { bestScore = s; best = arr[i]; }
    }
    if (!best) return null;
    return { dir: { x: best.x, y: best.y }, score: bestScore };
}

function chooseBestDirection(myX, myY, myRadius, intentDir) {
    const samples = CACHED_DIRECTIONS;
    if (samples.length === 0) {
        return { dir: (intentDir.x !== 0 || intentDir.y !== 0) ? intentDir : { x: 1, y: 0 }, invalid: true };
    }
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestIdx = 0;
    const step = Math.max(1, (samples.length / CONFIG.N_COARSE_DIRECTIONS) | 0);
    for (let i = 0; i < samples.length; i += step) {
        const raw = _cacheValid ? _cachedScores[i] : threatScore(samples[i], myX, myY, myRadius, intentDir);
        if (!Number.isFinite(raw)) continue;
        if (raw < bestScore) { bestScore = raw; best = samples[i]; bestIdx = i; }
    }
    for (let off = -2; off <= 2; off++) {
        if (off === 0) continue;
        const idx = (bestIdx + off + samples.length) % samples.length;
        const raw = _cacheValid ? _cachedScores[idx] : threatScore(samples[idx], myX, myY, myRadius, intentDir);
        if (!Number.isFinite(raw)) continue;
        if (raw < bestScore) { bestScore = raw; best = samples[idx]; }
    }
    if (best === null) {
        return { dir: (intentDir.x !== 0 || intentDir.y !== 0) ? intentDir : samples[0], invalid: true };
    }
    if (bestScore >= CONFIG.IMPACT_SCORE_THRESHOLD) {
        const spiral = spiralSearch(myX, myY, myRadius, intentDir);
        if (spiral && spiral.score < bestScore) best = spiral.dir;
    }
    return { dir: best };
}

function isVelocityUnsafeIdx(idx, dir, myX, myY, myRadius) {
    if (idx >= 0 && (_voCacheValid & (1 << idx))) return _voCache[idx] > 0;
    const unsafe = isVelocityUnsafeCompute(dir, myX, myY, myRadius);
    if (idx >= 0) {
        _voCache[idx] = unsafe ? 1 : 0;
        _voCacheValid |= (1 << idx);
    }
    return unsafe;
}

function isVelocityUnsafeCompute(dir, myX, myY, myRadius) {
    if (!isDirectionWalkable(myX, myY, dir.x, dir.y, myRadius)) return true;
    const dirVx = dir.x * CONFIG.CHAR_SPEED;
    const dirVy = dir.y * CONFIG.CHAR_SPEED;
    const T_FIELD = CONFIG.T_FIELD;
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
                if (t1 > 0 && t1 <= T_FIELD) return true;
            }
        }
    }
    return false;
}

function applyVO(dir, dirIdx, myX, myY, myRadius, intentDir) {
    if (!isVelocityUnsafeIdx(dirIdx, dir, myX, myY, myRadius)) return { dir: dir };
    const samples = CACHED_DIRECTIONS;
    let best = dir;
    let bestScore = 1e18;
    let foundSafe = false;
    for (let i = 0; i < samples.length; i++) {
        if (isVelocityUnsafeIdx(i, samples[i], myX, myY, myRadius)) continue;
        foundSafe = true;
        const s = _cacheValid ? _cachedScores[i] : threatScore(samples[i], myX, myY, myRadius, intentDir);
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

const _pairBuf = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

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
    _pairBuf[0].x = curr.x; _pairBuf[0].y = curr.y;
    _pairBuf[1].x = next.x; _pairBuf[1].y = next.y;
    _scoreBatchInto(_pairBuf, myX, myY, myRadius, intentDir, _batchScores);
    return _batchScores[0] <= _batchScores[1] * 1.15;
}

const _zeroDir = { x: 0, y: 0 };

const CONVERGENCE_BRAWLERS = new Set([
    'NANI',
]);

const IGNORED_BRAWLERS = new Set([
    'EL_PRIMO', 'MORTIS', 'ROSA', 'BIBI', 'JACKY', 'EDGAR', 'BUZZ',
    'FANG', 'SAM', 'HANK', 'DOUG', 'MICO', 'KIT', 'DRACO', 'LILY',
    'BULL', 'DARRYL', 'FRANK', 'ASH',
    'BARLEY', 'DYNAMIKE', 'TICK', 'SPROUT', 'GROM', 'WILLOW',
    'SQUEAK', 'JUJU',
    'POCO', 'EMZ',
    'SHADE', 'KAZE', 'ALLI', 'TRUNK', 'GIGI',
]);

function _isIgnoredProjectile(brawlerName, isBeam) {
    if (isBeam) return true;
    return brawlerName ? IGNORED_BRAWLERS.has(brawlerName) : false;
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
            if (len > 1) { dirX = ddx / len; dirY = ddy / len; }
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
            spawnTime: now,
            ownerLocked: !!owner,
            ignored: ignoredType,
            losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
            losProjTileX: -9999, losProjTileY: -9999,
            _svx: 0, _svy: 0, _dx: 0, _dy: 0, _rNoMove: 0,
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
        spawnTime: now,
        ownerLocked: !!owner,
        ignored: ignoredType,
        losBlocked: false, losMyTileX: -9999, losMyTileY: -9999,
        losProjTileX: -9999, losProjTileY: -9999,
        _svx: 0, _svy: 0, _dx: 0, _dy: 0, _rNoMove: 0,
    });
}

function syncProjectiles(now) {
    if (now === _lastSyncTime) return;
    _lastSyncTime = now;
    const charX = scanData.myX, charY = scanData.myY;
    const maxD2 = CONFIG.MAX_TRACK_DIST * CONFIG.MAX_TRACK_DIST;
    const staleMax = CONFIG.STALE_FRAMES_MAX;

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
                if (now - pr.lastSeen > CONFIG.STALE_MS) projectiles.delete(gid);
                continue;
            }
            nx = spRef.x; ny = spRef.y;
        } else {
            if (now - pr.lastSeen > CONFIG.STALE_MS) projectiles.delete(gid);
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
                pr.staleFrames = (pr.staleFrames || 0) + 1;
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
    const safetyR = myRadius + CONFIG.SAFETY_MARGIN;
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
        p._svx = p.dirX * p.speed;
        p._svy = p.dirY * p.speed;
        p._dx = p.x - myX;
        p._dy = p.y - myY;
        p._rNoMove = safetyR + (p.impactRadius || p.radius);
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
    _voCacheValid = 0;

    const tileX = (myX / 300) | 0;
    const tileY = (myY / 300) | 0;
    if (tileX !== _walkCacheTileX || tileY !== _walkCacheTileY) {
        _walkCache.clear();
        _walkCacheTileX = tileX;
        _walkCacheTileY = tileY;
    }

    CONFIG.CHAR_SPEED = scanData.mySpeed;
    syncProjectiles(now);
    buildActiveList(myX, myY, myRadius, tileX, tileY);

    _cacheValid = false;
    _precomputeCachedDirScores(myX, myY, myRadius, _zeroDir);

    const intentDir = _zeroDir;
    let heldDodgeDir = null;
    if (_dodgeDir) {
        if (isDirectionWalkable(myX, myY, _dodgeDir.x, _dodgeDir.y, myRadius) && !isVelocityUnsafeIdx(-1, _dodgeDir, myX, myY, myRadius)) {
            heldDodgeDir = _dodgeDir;
        }
    }
    if (_dodgeDir && now < g_dodgeUntil) {
        const ddx = myX - _lockOriginX;
        const ddy = myY - _lockOriginY;
        const dmax = CONFIG.LOCK_DRIFT_MAX;
        if (ddx * ddx + ddy * ddy > dmax * dmax) g_dodgeUntil = now;
    }
    const commit = !!_dodgeDir && now < g_dodgeUntil;
    const movingDir = heldDodgeDir || (commit ? _dodgeDir : _zeroDir);
    const mustDodge = getClosestImpactTime(myX, myY, myRadius, _zeroDir, getUrgentWindow()) >= 0;
    if (!mustDodge) { _dodgeDir = null; return; }
    let safeDir = heldDodgeDir;
    const prevDir = _dodgeDir;
    if (!safeDir) {
        const urg = getUrgentDodgeDir(myX, myY, myRadius, movingDir, intentDir);
        if (urg) {
            safeDir = applyVO(urg.dir, -1, myX, myY, myRadius, intentDir).dir;
        } else {
            const choice = chooseBestDirection(myX, myY, myRadius, intentDir);
            if (choice.invalid) {
                _dodgeDir = null;
                return;
            }
            safeDir = applyVO(choice.dir, -1, myX, myY, myRadius, intentDir).dir;
        }
        if (shouldKeepCurrentUrgentDodge(prevDir, safeDir, myX, myY, myRadius, intentDir)) safeDir = prevDir;
    }
    lastSafeDir = safeDir;
    lastSafeDirTime = now;
    _dodgeDir = safeDir;
    if (!sameDirection(prevDir, safeDir)) {
        g_dodgeUntil = now + CONFIG.DODGE_COMMIT_MS;
        _lockOriginX = myX;
        _lockOriginY = myY;
    }
}

export function setupAutododge(base) {
    _base = base;
    _fns = getFunctions();
    _checkInitDirections();

    try {
        _isBeamFn = new NativeFunction(base.add(offsets.LogicProjectileData__isBeam), 'bool', ['pointer']);
    } catch (_) {
        _isBeamFn = null;
    }

    Interceptor.attach(base.add(offsets.Projectile_ctor), {
        onEnter: function (args) { this._proj = args[1]; },
        onLeave: function () { _initFromCtor(this._proj); }
    });

    Interceptor.attach(base.add(offsets.BattleScreen__updateMovement), {
        onEnter: function (args) {
            let tx, ty;

            if (state.autododge && _dodgeDir) {
                const d = _dodgeDir;
                if (!isFinite(d.x) || !isFinite(d.y)) return;
                tx = Math.round(scanData.myX + d.x * 500);
                ty = Math.round(scanData.myY + d.y * 500);
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
}
