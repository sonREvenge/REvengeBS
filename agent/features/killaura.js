import { losCheck } from "../utils/wallCache.js";
import { state } from "../utils/flags.js";
import { offsets } from "../core/offsets.js";
import { scanData } from "../core/scanner.js";
import { isLauncher, resolveBrawlerRange } from "../core/brawler_db.js";
import { computeAimForTarget } from "./aimbot.js";
import { getBattleScreen, getBattleScreenTs } from "./camera.js";
import { getFunctions } from "../core/functions.js";
import { getLibc } from "../utils/utils.js";
import { logInfo } from "../utils/logger.js";

const CMD_SUPER = 1;
const CMD_HYPER = 17;
const CMD_BUF_SIZE = 0x64;
const SKILL_THROTTLE_MS = 1500;
let _constructCmd = null;
let _addInputFn = null;
let _zeroBuf = null;

const CFG = {
    ERROR_COOLDOWN_MS:        2000,
    BATTLE_SCREEN_MAX_AGE_MS: 200,
    FALLBACK_INTERVAL_MS:     1000,
    STICKY_RANGE_BUFFER:      200,
};

const _opts = {
    useAttack: true,
    useSuper:  false,
    useHyper:  false,
};
let _superBrawlersSet = new Set();

let _errorUntil = 0;
let _wrapperFn  = null;
let _getMsBetweenAttacks = null;
let _lastAttackMs = 0;
let _lastSuperMs = 0;
let _lastHyperMs = 0;
let _stickyGid = null;
const _attackRateCache = new Map();

export function setKillauraOptions(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.useAttack === 'boolean') _opts.useAttack = o.useAttack;
    if (typeof o.useSuper === 'boolean')  _opts.useSuper  = o.useSuper;
    if (typeof o.useHyper === 'boolean')  _opts.useHyper  = o.useHyper;
    if (Array.isArray(o.superBrawlers)) {
        _superBrawlersSet = new Set();
        for (const name of o.superBrawlers) {
            if (typeof name === 'string') _superBrawlersSet.add(name.toUpperCase());
        }
    }
    logInfo('killaura opts set', { ..._opts, superBrawlersCount: _superBrawlersSet.size });
}

function _resolveAttackInterval() {
    const bid = scanData.myBrawlerId | 0;
    if (_attackRateCache.has(bid)) return _attackRateCache.get(bid);
    let ms = 0;
    try {
        if (_getMsBetweenAttacks) {
            const own = scanData.ownCharacter;
            if (own && !own.isNull()) {
                const fns = getFunctions();
                const skill = fns.LogicCharacterClient_getWeaponSkill(own);
                if (skill && !skill.isNull()) {
                    const v = _getMsBetweenAttacks(skill) | 0;
                    if (v > 0 && v < 10000) ms = v;
                }
            }
        }
    } catch (_) { ms = 0; }
    if (ms <= 0) ms = CFG.FALLBACK_INTERVAL_MS;
    if (bid > 0) _attackRateCache.set(bid, ms);
    return ms;
}

export function resetKillaura() {
    _stickyGid = null;
    _lastAttackMs = 0;
    _lastSuperMs = 0;
    _lastHyperMs = 0;
    _attackRateCache.clear();
}

function _pickTarget(myX, myY) {
    const range = resolveBrawlerRange(scanData.myBrawlerName, scanData.myBrawlerId);
    if (range <= 0) return null;
    const rangeSq = range * range;
    const stickyRangeSq = (range + CFG.STICKY_RANGE_BUFFER) * (range + CFG.STICKY_RANGE_BUFFER);
    const launcher = isLauncher(scanData.myBrawlerId, scanData.myBrawlerName);
    let bestX = 0, bestY = 0, bestGid = null;

    if (_stickyGid) {
        const enemies = scanData.enemies || [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.gid !== _stickyGid) continue;
            const dx = e.x - myX, dy = e.y - myY, d2 = dx * dx + dy * dy;
            if (d2 < stickyRangeSq) {
                if (launcher || losCheck(myX, myY, e.x, e.y, 0x40)) {
                    bestX = e.x; bestY = e.y; bestGid = e.gid;
                }
            }
            break;
        }
        if (!bestGid) _stickyGid = null;
    }

    if (!bestGid) {
        let bestDist = 1e18;
        for (const e of (scanData.enemies || [])) {
            const dx = e.x - myX, dy = e.y - myY, d2 = dx * dx + dy * dy;
            if (d2 >= rangeSq || d2 >= bestDist) continue;
            if (!launcher && !losCheck(myX, myY, e.x, e.y, 0x40)) continue;
            bestDist = d2; bestX = e.x; bestY = e.y; bestGid = e.gid;
        }
    }

    if (!bestGid) return null;
    _stickyGid = bestGid;
    return { gid: bestGid, x: bestX, y: bestY };
}

function _resolveFire(myX, myY, tgt) {
    let fireX = tgt.x, fireY = tgt.y;
    let predUsed = false;
    const aim = computeAimForTarget(tgt.gid, myX, myY);
    if (aim) { fireX = aim.x; fireY = aim.y; predUsed = true; }
    return { fireX, fireY, predUsed };
}

function _doAttack(bs, own, fireX, fireY) {
    if (!_wrapperFn) return false;
    try {
        bs.add(offsets.BattleScreen_manualFireX).writeS32(fireX);
        bs.add(offsets.BattleScreen_manualFireY).writeS32(fireY);
        bs.add(offsets.BattleScreen_autoFireX).writeS32(fireX);
        bs.add(offsets.BattleScreen_autoFireY).writeS32(fireY);
        bs.add(offsets.BattleScreen_autoshootPredOff).writeS32(0);
        _wrapperFn(bs, own);
        return true;
    } catch (_) {
        return false;
    }
}

function _dispatchSkillCmd(cmdType, myX, myY, fireX, fireY) {
    if (!_constructCmd || !_addInputFn) return false;
    try {
        const fns = getFunctions();
        const battle = fns.BattleMode_getInstance();
        if (!battle || battle.isNull()) return false;
        const mgr = battle.add(offsets.BattleMode_clientInputManager).readPointer();
        if (!mgr || mgr.isNull()) return false;
        const lc = getLibc();
        const ci = lc.malloc(CMD_BUF_SIZE);
        if (!ci || ci.isNull()) return false;
        Memory.writeByteArray(ci, _zeroBuf);
        _constructCmd(ci, cmdType);
        ci.add(0xc).writeS32((fireX - myX) | 0);
        ci.add(0x10).writeS32((fireY - myY) | 0);
        _addInputFn(mgr, ci);
        return true;
    } catch (_) {
        return false;
    }
}

export function updateKillaura(now) {
    if (!state.killaura) return;
    const _battleScreen = getBattleScreen();
    if (!_battleScreen) return;
    if (now === undefined) now = Date.now();
    if (now < _errorUntil) return;
    if (now - scanData.lastUpdate > 500) return;
    if (now - getBattleScreenTs() > CFG.BATTLE_SCREEN_MAX_AGE_MS) return;

    const anyEnabled = _opts.useAttack || _opts.useSuper || _opts.useHyper;
    if (!anyEnabled) return;

    try {
        const myX = scanData.myX, myY = scanData.myY;
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return;

        const tgt = _pickTarget(myX, myY);
        if (!tgt) return;

        const fire = _resolveFire(myX, myY, tgt);

        if (_opts.useAttack) {
            const interval = _resolveAttackInterval();
            if (now - _lastAttackMs >= interval) {
                if (_doAttack(_battleScreen, own, fire.fireX, fire.fireY)) {
                    _lastAttackMs = now;
                }
            }
        }
        if (_opts.useSuper && now - _lastSuperMs >= SKILL_THROTTLE_MS) {
            const myName = scanData.myBrawlerName;
            if (_superBrawlersSet.size > 0 && myName && _superBrawlersSet.has(myName)) {
                _lastSuperMs = now;
                _dispatchSkillCmd(CMD_SUPER, myX, myY, fire.fireX, fire.fireY);
            }
        }
        if (_opts.useHyper && now - _lastHyperMs >= SKILL_THROTTLE_MS) {
            _lastHyperMs = now;
            _dispatchSkillCmd(CMD_HYPER, myX, myY, myX, myY);
        }
    } catch (_) {
        _errorUntil = Date.now() + CFG.ERROR_COOLDOWN_MS;
    }
}

export function setupKillaura(base) {
    try {
        _wrapperFn = new NativeFunction(base.add(offsets.BattleScreen_fireWrapperFn), 'int', ['pointer', 'pointer']);
    } catch (_) {
        _wrapperFn = null;
    }
    try {
        _getMsBetweenAttacks = new NativeFunction(
            base.add(offsets.LogicSkillData__getMsBetweenAttacks),
            'int', ['pointer']
        );
    } catch (_) {
        _getMsBetweenAttacks = null;
    }
    try {
        _constructCmd = new NativeFunction(
            base.add(offsets.ClientInput_constructor_int),
            'pointer', ['pointer', 'int']
        );
        _addInputFn = new NativeFunction(
            base.add(offsets.ClientInputManager_addInput),
            'void', ['pointer', 'pointer']
        );
        _zeroBuf = new Uint8Array(CMD_BUF_SIZE);
    } catch (_) { _constructCmd = null; _addInputFn = null; }
}
