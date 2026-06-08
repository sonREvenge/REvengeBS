let _enabled = false;
let _buf = [];
let _timer = null;

function _flush() {
    if (!_buf.length) { _timer = null; return; }
    const entries = _buf;
    _buf = [];
    _timer = null;
    try { send({ type: "LOG_BATCH", entries }); } catch (_) {}
}

function _push(lvl, cat, msg, data) {
    if (!_enabled) return;
    const entry = { lvl, cat: String(cat || "?"), msg: String(msg || "") };
    if (data !== undefined) entry.data = data;
    _buf.push(entry);
    if (_buf.length >= 32) {
        _flush();
    } else if (_timer === null) {
        _timer = setTimeout(_flush, 100);
    }
}

export function setLoggingEnabled(v) {
    const next = !!v;
    if (next === _enabled) return;
    _enabled = next;
    if (_enabled) {
        _push("info", "DEBUG", "agent logging enabled");
    } else {
        _flush();
    }
}

export function isLoggingEnabled() { return _enabled; }

export function logInfo(cat, msg, data)  { _push("info",  cat, msg, data); }
export function logWarn(cat, msg, data)  { _push("warn",  cat, msg, data); }
export function logError(cat, msg, data) { _push("error", cat, msg, data); }
export function logDebug(cat, msg, data) { _push("info",  cat, msg, data); }
export function logPerf(cat, msg, data)  { _push("info",  cat, msg, data); }

const _everyCounts = Object.create(null);
export function logEvery(cat, n, msg, data) {
    if (!_enabled) return;
    const k = String(cat || "?");
    const c = (_everyCounts[k] || 0) + 1;
    _everyCounts[k] = c;
    if (c % (n | 0 || 1) === 0) _push("info", cat, msg, data);
}

const _timers = Object.create(null);
export function timerStart(label) { _timers[label] = Date.now(); }
export function timerStop(label) {
    const t0 = _timers[label]; if (t0 == null) return 0;
    delete _timers[label];
    return Date.now() - t0;
}
export function timerFlush() {}

export function safe(cat, label, fn) {
    try { return fn(); } catch (e) {
        if (_enabled) _push("error", cat, label + " threw: " + (e && e.message));
    }
}
