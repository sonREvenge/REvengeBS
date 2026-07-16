import { offsets } from "../core/offsets.js";
import { state } from "../utils/flags.js";
import { getFunctions } from "../core/functions.js";
import { getLibc } from "../utils/utils.js";

const CMD_SPRAY = 15;
const CMD_BUF_SIZE = 0x64;

const _opts = { intervalMs: 600 };
let _lastFire = 0;
let _constructCmd = null;
let _addInput = null;
let _zeroBuf = null;

export function setSprayOptions(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.intervalMs === 'number' && isFinite(o.intervalMs)) {
        _opts.intervalMs = Math.max(100, Math.min(5000, o.intervalMs | 0));
    }
}

export function resetSpray() {
    _lastFire = 0;
}

export function setupSpray(base) {
    try {
        _constructCmd = new NativeFunction(
            base.add(offsets.ClientInput_constructor_int),
            'pointer', ['pointer', 'int']
        );
        _addInput = new NativeFunction(
            base.add(offsets.ClientInputManager_addInput),
            'void', ['pointer', 'pointer']
        );
    } catch (_) {
        _constructCmd = null;
        _addInput = null;
    }
    _zeroBuf = new Uint8Array(CMD_BUF_SIZE);
}

export function updateSpray(now) {
    if (!state.spray || !_constructCmd || !_addInput) return;
    if (now === undefined) now = Date.now();
    if (now - _lastFire < _opts.intervalMs) return;
    try {
        const fns = getFunctions();
        const battle = fns.BattleMode_getInstance();
        if (!battle || battle.isNull()) return;
        const mgr = battle.add(offsets.BattleMode_clientInputManager).readPointer();
        if (!mgr || mgr.isNull()) return;
        const lc = getLibc();
        const ci = lc.malloc(CMD_BUF_SIZE);
        if (!ci || ci.isNull()) return;
        Memory.writeByteArray(ci, _zeroBuf);
        _constructCmd(ci, CMD_SPRAY);
        _addInput(mgr, ci);
        _lastFire = now;
    } catch (_) {}
}
