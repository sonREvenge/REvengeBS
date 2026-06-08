import { losCheck } from "../utils/wallCache.js";
import { state } from "../utils/flags.js";
import { offsets } from "../core/offsets.js";
import { scanData } from "../core/scanner.js";
import { isLauncher, resolveBrawlerProjSpeed } from "../core/brawler_db.js";
import { getFunctions } from "../core/functions.js";
import { estimateTargetVelocity, solveIntercept } from "../libs/math_aim.js";
import { getDodgeDir } from "./autododge.js";
import { CFG } from "../utils/config.js";

const targets = new Map();
let bestTargetId = null;
let _lastCleanupTs = 0;
let _burstLockPos = null;
let _burstLockUntil = 0;
let _burstLockTargetId = null;
let _burstLockTgtX = null;
let _burstLockTgtY = null;
const _losCache = new Map();

function pickBestTarget(enemies, myX, myY, prevGid) {
    const wDist     = CFG.SCORE_DIST_WEIGHT;
    const wSpeed    = CFG.SCORE_SPEED_WEIGHT;
    const wApproach = CFG.SCORE_APPROACH_WEIGHT;
    const wFacing   = CFG.SCORE_FACING_WEIGHT;
    const sticky    = CFG.TARGET_STICKY_RATIO;
    const statFloor = CFG.STATIONARY_VEL_FLOOR;
    const statRatio = CFG.STATIONARY_VEL_RATIO;
    const defMove   = CFG.DEFAULT_MOVE_SPEED;

    let bestGid = 0;
    let bestScore = 1e18;
    let prevScore = 1e18;
    let prevFound = false;

    const n = enemies.length;
    for (let i = 0; i < n; i++) {
        const e = enemies[i];
        if (!e.losClear) continue;

        const vx = e.vxEma;
        const vy = e.vyEma;
        const speed = Math.sqrt(vx * vx + vy * vy);

        const dx = e.x - myX;
        const dy = e.y - myY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const invD = 1 / (dist + 1e-6);
        const approach = -(dx * vx + dy * vy) * invD;

        let facing = 0;
        const move = e.moveSpeed > 0 ? e.moveSpeed : defMove;
        const thr = statFloor > move * statRatio ? statFloor : move * statRatio;
        if (speed > thr) {
            const maxSp = speed > 1 ? speed : 1;
            facing = (-dx * vx - dy * vy) * invD / maxSp;
        }

        const score = dist * wDist - speed * wSpeed - approach * wApproach - facing * wFacing * dist;

        const gidInt = e.gidInt;
        if (prevGid !== 0 && gidInt === prevGid) {
            prevScore = score;
            prevFound = true;
        }
        if (score < bestScore) {
            bestScore = score;
            bestGid = gidInt;
        }
    }

    if (prevFound && bestGid !== prevGid && prevScore <= bestScore / sticky) {
        bestGid = prevGid;
    }
    return bestGid;
}

let _sharedBattleScreen = null;
let _sharedBattleScreenTs = 0;
export function getSharedBattleScreen()   { return _sharedBattleScreen; }
export function getSharedBattleScreenTs() { return _sharedBattleScreenTs; }
export function getBestTargetId()         { return bestTargetId; }

export function resetAimbot() {
    targets.clear();
    bestTargetId = null;
    _lastCleanupTs = 0;
    _burstLockPos = null;
    _burstLockUntil = 0;
    _burstLockTargetId = null;
    _burstLockTgtX = null;
    _burstLockTgtY = null;
    _losCache.clear();
    _sharedBattleScreen = null;
    _sharedBattleScreenTs = 0;
    _projSpeedCache.brawlerId = -1;
    _projSpeedCache.speed = 0;
}

function RingBuf(max) { this.d = []; this.max = max; }
RingBuf.prototype.push = function (v) {
    this.d.push(v);
    if (this.d.length > this.max) this.d.shift();
};

function hasLineOfSight(x0, y0, x1, y1) {
    const tx0 = (x0 / 300) | 0, ty0 = (y0 / 300) | 0;
    const tx1 = (x1 / 300) | 0, ty1 = (y1 / 300) | 0;
    const key = (((tx0 & 0x7f) << 21) | ((ty0 & 0x7f) << 14) | ((tx1 & 0x7f) << 7) | (ty1 & 0x7f)) | 0;
    const now = Date.now();
    const cached = _losCache.get(key);
    if (cached !== undefined && now - cached.ts < CFG.LOS_CACHE_TTL_MS) return cached.v;
    const v = losCheck(x0, y0, x1, y1, 0x40);
    _losCache.set(key, { v, ts: now });
    return v;
}

const _projSpeedCache = { brawlerId: -1, speed: 0 };

function _readOwnProjSpeedRuntime() {
    try {
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return 0;
        const fns = getFunctions();
        const skill = fns.LogicCharacterClient_getWeaponSkill(own);
        if (!skill || skill.isNull()) return 0;
        const projData = fns.getProjData(skill);
        if (!projData || projData.isNull()) return 0;
        const speed = fns.LogicProjectileData_getSpeed(projData);
        if (speed >= 500 && speed <= 15000) return speed >>> 0;
    } catch (_) {}
    return 0;
}

const _DEFAULT_PROJ_SPEED = 3000;

function resolveProjSpeed() {
    const bid = scanData.myBrawlerId | 0;
    if (bid === _projSpeedCache.brawlerId && _projSpeedCache.speed > 0) {
        return _projSpeedCache.speed;
    }
    let s = _readOwnProjSpeedRuntime();
    if (!s) s = resolveBrawlerProjSpeed(scanData.myBrawlerName);
    if (s > 0) {
        _projSpeedCache.brawlerId = bid;
        _projSpeedCache.speed = s;
        return s;
    }
    return _DEFAULT_PROJ_SPEED;
}

export function computeAimForTarget(targetId, ownX, ownY) {
    const tgt = targets.get(targetId);
    if (!tgt || tgt.histX.d.length < 2) return null;

    const projSpeed = resolveProjSpeed();
    if (projSpeed <= 0) return null;
    const rawVel = tgt._velCached || estimateTargetVelocity(tgt.histX.d, tgt.histY.d, tgt.histT.d);
    let scale = 1.0;
    if (rawVel.directionChanging) scale = CFG.JUKING_LEAD_SCALE;
    else if (!rawVel.confident)   scale = CFG.UNCONFIDENT_LEAD_SCALE;
    const targetVel = scale === 1.0 ? rawVel : {
        vx: rawVel.vx * scale,
        vy: rawVel.vy * scale,
        speed: rawVel.speed * scale,
        confident: rawVel.confident,
        directionChanging: rawVel.directionChanging,
    };

    const intercept = solveIntercept(ownX, ownY, tgt.x, tgt.y, targetVel, projSpeed);

    if (!isFinite(intercept.x) || !isFinite(intercept.y)) return null;
    return { x: Math.round(intercept.x), y: Math.round(intercept.y), mode: "PREDICT_LINEAR" };
}

export function setupAimbot(base) {
    Interceptor.attach(base.add(offsets.BattleScreen__updateAutoshoot), {
        onEnter: function (args) {
            _sharedBattleScreen = args[0];
            _sharedBattleScreenTs = Date.now();
        }
    });

    Interceptor.attach(base.add(offsets.BattleScreen_activateSkill), {
        onEnter: function (args) {
            if (!state.aimbot) return;
            if (scanData.lastUpdate === 0) return;
            const enemyId = bestTargetId;
            if (!enemyId || !targets.has(enemyId)) return;

            const nowMs = Date.now();

            if (_burstLockPos && _burstLockTargetId === enemyId && nowMs < _burstLockUntil) {
                const tgtNow = targets.get(enemyId);
                let drifted = false;
                if (tgtNow && _burstLockTgtX !== null) {
                    const ddx = tgtNow.x - _burstLockTgtX;
                    const ddy = tgtNow.y - _burstLockTgtY;
                    if (ddx * ddx + ddy * ddy > CFG.BURST_LOCK_MAX_DRIFT * CFG.BURST_LOCK_MAX_DRIFT) drifted = true;
                }
                if (!drifted) {
                    try {
                        args[1] = ptr(_burstLockPos.x);
                        args[2] = ptr(_burstLockPos.y);
                    } catch (_) {}
                    return;
                }
            }

            const dodge = getDodgeDir();
            const mySpd = scanData.mySpeed || CFG.DEFAULT_MOVE_SPEED;
            const effectMyX = scanData.myX + (dodge ? dodge.x * mySpd * CFG.SHOOT_LAG_S : 0);
            const effectMyY = scanData.myY + (dodge ? dodge.y * mySpd * CFG.SHOOT_LAG_S : 0);

            const aim = computeAimForTarget(enemyId, effectMyX, effectMyY);
            if (!aim) return;

            if (!isLauncher(scanData.myBrawlerId, scanData.myBrawlerName)
                && !hasLineOfSight(scanData.myX, scanData.myY, aim.x, aim.y)) return;

            _burstLockPos = aim;
            _burstLockTargetId = enemyId;
            _burstLockUntil = nowMs + CFG.BURST_LOCK_MS;
            const lockTgt = targets.get(enemyId);
            if (lockTgt) { _burstLockTgtX = lockTgt.x; _burstLockTgtY = lockTgt.y; }

            try {
                args[1] = ptr(aim.x);
                args[2] = ptr(aim.y);
            } catch (_) {}
        }
    });
}

export function updateAimbot(now) {
    if ((!state.aimbot && !state.killaura) || scanData.lastUpdate === 0) return;

    const myX = scanData.myX, myY = scanData.myY;
    if (now === undefined) now = Date.now();
    const prevTargetId = bestTargetId;
    bestTargetId = null;

    const enemies = scanData.enemies || [];
    const activeEnemies = [];

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.brawlerName) continue;
        if (enemy.teamId === scanData.myTeamId) continue;

        const gid = enemy.gid;
        let t = targets.get(gid);
        if (!t) {
            t = {
                histX: new RingBuf(CFG.HISTORY_LEN),
                histY: new RingBuf(CFG.HISTORY_LEN),
                histT: new RingBuf(CFG.HISTORY_LEN - 1),
                lastUpdate: now,
                x: enemy.x,
                y: enemy.y,
                brawlerId: enemy.brawlerId,
                emaVx: 0, emaVy: 0,
                moveSpeed: enemy.moveSpeed || CFG.DEFAULT_MOVE_SPEED,
            };
            targets.set(gid, t);
        }

        const dt = now - t.lastUpdate;
        if (dt > 0 && dt < 300) {
            const invDt = 1000 / dt;
            const rawVx = (enemy.x - t.x) * invDt;
            const rawVy = (enemy.y - t.y) * invDt;
            const alpha = Math.min(CFG.EMA_ALPHA, dt / 80);
            const oneMinus = 1 - alpha;
            t.emaVx = t.emaVx * oneMinus + rawVx * alpha;
            t.emaVy = t.emaVy * oneMinus + rawVy * alpha;
        }
        t.x = enemy.x; t.y = enemy.y; t.brawlerId = enemy.brawlerId;
        if (enemy.moveSpeed > 0) t.moveSpeed = enemy.moveSpeed;
        t.histX.push(enemy.x); t.histY.push(enemy.y);
        if (dt > 0 && dt < 2000) t.histT.push(dt);
        t.lastUpdate = now;

        const targetVel = estimateTargetVelocity(t.histX.d, t.histY.d, t.histT.d);
        t._velCached = targetVel;

        const losClear = (isLauncher(scanData.myBrawlerId, scanData.myBrawlerName) || hasLineOfSight(myX, myY, enemy.x, enemy.y)) ? 1 : 0;

        activeEnemies.push({
            gid: gid,
            gidInt: parseInt(gid) | 0,
            x: enemy.x,
            y: enemy.y,
            brawlerId: enemy.brawlerId,
            moveSpeed: t.moveSpeed,
            histLen: t.histX.d.length,
            vxEma: targetVel.vx,
            vyEma: targetVel.vy,
            losClear: losClear
        });
    }

    if (activeEnemies.length > 0) {
        const prevGid = prevTargetId ? (parseInt(prevTargetId) | 0) : 0;
        const bestGid = pickBestTarget(activeEnemies, myX, myY, prevGid);
        if (bestGid !== 0) bestTargetId = bestGid.toString();
    }

    if (bestTargetId !== _burstLockTargetId) {
        _burstLockPos = null;
        _burstLockTargetId = null;
        _burstLockTgtX = null;
        _burstLockTgtY = null;
    }

    if (now - _lastCleanupTs > 1000) {
        for (const [id, t] of targets) {
            if (now - t.lastUpdate > CFG.STALE_MS) targets.delete(id);
        }
        for (const [k, v] of _losCache) {
            if (now - v.ts > CFG.LOS_CACHE_PURGE_MS) _losCache.delete(k);
        }
        _lastCleanupTs = now;
    }
}
