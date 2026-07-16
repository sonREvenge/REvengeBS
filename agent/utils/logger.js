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

function _push(lvl, msg, data) {
    if (!_enabled) return;
    const entry = { lvl, msg: String(msg || "") };
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
        _push("info", "agent logging enabled");
    } else {
        _flush();
    }
}

export function isLoggingEnabled() { return _enabled; }

export function logInfo(msg, data) { _push("info", msg, data); }

const _everyCounts = Object.create(null);
export function logEvery(n, msg, data) {
    if (!_enabled) return;
    const k = String(msg || "");
    const c = (_everyCounts[k] || 0) + 1;
    _everyCounts[k] = c;
    if (c % (n | 0 || 1) === 0) _push("info", msg, data);
}
