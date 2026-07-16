let _libc = null;

export function initUtils(libc) {
    _libc = libc;
}

export function getLibc() {
    if (!_libc) throw new Error("Utils not initialized! Call initUtils(libc) first.");
    return _libc;
}
