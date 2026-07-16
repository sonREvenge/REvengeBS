import { offsets } from "../core/offsets.js";
import { state } from "../utils/flags.js";
import { getLibc } from "../utils/utils.js";
import { getFunctions } from "../core/functions.js";

const _brawltv = { count: 69 };
const _spec    = { count: 69 };

let _gotoAndStop = null;
let _setText = null;
let _brawltvStr = null;
let _specStr = null;

function _buildCountStr(count) {
    try {
        const lc = getLibc();
        const fns = getFunctions();
        const raw = Memory.allocUtf8String(String(count));
        const buf = lc.malloc(128);
        fns.StringCtor(buf, raw);
        return buf;
    } catch (_) {
        return null;
    }
}

export function setBrawlTvOptions(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.count === 'number' && isFinite(o.count)) {
        const v = Math.max(0, Math.min(99999, o.count | 0));
        if (v !== _brawltv.count) { _brawltv.count = v; _brawltvStr = null; }
    }
}

export function setSpecOptions(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.count === 'number' && isFinite(o.count)) {
        const v = Math.max(0, Math.min(99999, o.count | 0));
        if (v !== _spec.count) { _spec.count = v; _specStr = null; }
    }
}

export function resetSpectator() {
    _brawltvStr = null;
    _specStr = null;
}

export function setupSpectator(base) {
    try {
        _gotoAndStop = new NativeFunction(
            base.add(offsets.MovieClip__gotoAndStopFrameIndex),
            'pointer', ['pointer', 'int']
        );
        _setText = new NativeFunction(
            base.add(offsets.TextField_setText),
            'pointer', ['pointer', 'pointer']
        );
        Interceptor.attach(base.add(offsets.BattleScreen__update), {
            onEnter(args) { this.screen = args[0]; },
            onLeave(_) {
                const wantBrawltv = state.brawltv;
                const wantSpec = state.spec;
                if (!wantBrawltv && !wantSpec) return;
                try {
                    const screen = this.screen;
                    if (!screen || screen.isNull()) return;
                    const widget = screen.add(offsets.BattleScreen_spectateWidget).readPointer();
                    if (!widget || widget.isNull()) return;
                    const tf = screen.add(offsets.BattleScreen_spectateTextField).readPointer();
                    if (!tf || tf.isNull()) return;

                    let str, frame;
                    if (wantBrawltv) {
                        if (!_brawltvStr) _brawltvStr = _buildCountStr(_brawltv.count);
                        str = _brawltvStr;
                        frame = 1;
                    } else {
                        if (!_specStr) _specStr = _buildCountStr(_spec.count);
                        str = _specStr;
                        frame = 0;
                    }
                    if (!str) return;

                    widget.add(8).writeU8(1);
                    _setText(tf, str);
                    _gotoAndStop(widget, frame);
                } catch (_) {}
            }
        });
    } catch (_) {
        _gotoAndStop = null;
        _setText = null;
    }
}
