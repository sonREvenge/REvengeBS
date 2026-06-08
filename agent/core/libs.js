let _base = null;
let _libc = null;

export function libg(intervalMs = 50) {
    if (_base) return Promise.resolve(_base);

    let mod = Process.findModuleByName("libg.so");
    if (mod) {
        _base = mod.base;
        return Promise.resolve(_base);
    }

    return new Promise((resolve) => {
        const id = setInterval(() => {
            mod = Process.findModuleByName("libg.so");
            if (mod) {
                clearInterval(id);
                _base = mod.base;
                resolve(_base);
            }
        }, intervalMs);
    });
}

export function libc(intervalMs = 50) {
    if (_libc) return Promise.resolve(_libc);

    let mod = Process.findModuleByName("libc.so");
    if (mod) {
        _libc = _initLibc(mod);
        return Promise.resolve(_libc);
    }

    return new Promise((resolve) => {
        const id = setInterval(() => {
            mod = Process.findModuleByName("libc.so");
            if (mod) {
                clearInterval(id);
                _libc = _initLibc(mod);
                resolve(_libc);
            }
        }, intervalMs);
    });
}

function _initLibc(mod) {
    return {
        malloc: new NativeFunction(mod.getExportByName("malloc"), "pointer", ["uint"])
    };
}
