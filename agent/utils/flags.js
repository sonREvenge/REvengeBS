export const FLAG_AIMBOT    = 1 << 0;
export const FLAG_AUTODODGE = 1 << 1;
export const FLAG_ESP       = 1 << 2;
export const FLAG_SPINNER   = 1 << 3;
export const FLAG_KILLAURA  = 1 << 4;

const FLAG_OF = {
    aimbot:    FLAG_AIMBOT,
    autododge: FLAG_AUTODODGE,
    esp:       FLAG_ESP,
    spinner:   FLAG_SPINNER,
    killaura:  FLAG_KILLAURA,
};

let _flags = 0;

export const state = {
    aimbot:    false,
    autododge: false,
    esp:       false,
    spinner:   false,
    killaura:  false,
};

export function setState(feature, value) {
    if (!(feature in state)) return;
    const v = !!value;
    state[feature] = v;
    const bit = FLAG_OF[feature] | 0;
    if (v) _flags |=  bit;
    else   _flags &= ~bit;
}

export function getFlags() { return _flags; }

export function setupSafe(label, fn) {
    try { fn(); }
    catch (e) {
        try { send({ type: 'ERROR', code: 2, text: `setup ${label}: ${e && e.message ? e.message : e}` }); } catch (_) {}
    }
}
