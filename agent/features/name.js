import { offsets } from "../core/offsets.js";
import { getFunctions } from "../core/functions.js";
import { getLibc } from "../utils/utils.js";

const TAG_FROM = "[BSD]";
const _CACHE_MAX = 64;
let _tag = "";
const _strCache = new Map();

export function setTag(text) {
    _tag = String(text || "");
}

function _createScString(str) {
    const fns = getFunctions();
    const lc = getLibc();
    const raw = Memory.allocUtf8String(str);
    const obj = lc.malloc(128);
    fns.StringCtor(obj, raw);
    return obj;
}

function _readInline(scStr, len) {
    try { return scStr.add(offsets.ScString_data).readUtf8String(len); }
    catch (_) { return null; }
}

function _readHeap(scStr, len) {
    try {
        const p = scStr.add(offsets.ScString_data).readPointer();
        if (p && !p.isNull()) return p.readUtf8String(len);
    } catch (_) {}
    return null;
}

function _readScText(scStr) {
    if (!scStr || scStr.isNull()) return null;
    let len;
    try { len = scStr.add(offsets.ScString_length).readU32(); }
    catch (_) { return null; }
    if (len <= 0 || len > 256) return null;
    const inline = _readInline(scStr, len);
    if (inline && inline.indexOf(TAG_FROM) !== -1) return inline;
    const heap = _readHeap(scStr, len);
    if (heap && heap.indexOf(TAG_FROM) !== -1) return heap;
    return null;
}

function _rewriteScArg(args, idx) {
    try {
        const text = _readScText(args[idx]);
        if (!text) return;
        const replacement = "[" + _tag + "]";
        const fixed = text.split(TAG_FROM).join(replacement);
        const key = _tag + "|" + fixed;
        let obj = _strCache.get(key);
        if (!obj) {
            obj = _createScString(fixed);
            _strCache.set(key, obj);
            if (_strCache.size > _CACHE_MAX) {
                const firstKey = _strCache.keys().next().value;
                if (firstKey !== undefined) _strCache.delete(firstKey);
            }
        }
        args[idx] = obj;
    } catch (_) {}
}

function _attachRewrite(base, off, argIdx) {
    try {
        Interceptor.attach(base.add(off), {
            onEnter(args) {
                if (!_tag) return;
                _rewriteScArg(args, argIdx);
            }
        });
    } catch (_) {}
}

export function setupName(base) {
    _attachRewrite(base, offsets.MovieClipHelper__setTextAndScaleIfNecessary, 1);
    _attachRewrite(base, offsets.TextField_setText,                           1);
    _attachRewrite(base, offsets.TextField_setText_ui,                        1);
}
