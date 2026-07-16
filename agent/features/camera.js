import { offsets } from "../core/offsets.js";
import { state } from "../utils/flags.js";

const CAM_MODE_OFFSET = 0x8AC;
const CAM_ZOOM_OFFSET = 0x94C;

const _opts = {
    mode:        0,
    zoomEnabled: false,
    zoom:        2200,
};

let _bs = null;
let _bsTs = 0;
let _defaultZoom = 0;
let _defaultZoomReported = false;
let _defaultMode = 0;
let _defaultModeReported = false;

export function getBattleScreen()   { return _bs; }
export function getBattleScreenTs() { return _bsTs; }
export function getDefaultZoom()    { return _defaultZoom; }
export function getDefaultMode()    { return _defaultMode; }

export function setCameraOptions(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.mode === 'number' && isFinite(o.mode)) {
        _opts.mode = Math.max(0, Math.min(255, o.mode | 0));
    }
    if (typeof o.zoomEnabled === 'boolean') _opts.zoomEnabled = o.zoomEnabled;
    if (typeof o.zoom === 'number' && isFinite(o.zoom)) {
        _opts.zoom = Math.max(-100000, Math.min(100000, o.zoom));
    }
}

export function resetCamera() {
    _bs = null;
    _bsTs = 0;
    _defaultZoomReported = false;
    _defaultModeReported = false;
}

export function setupCamera(base) {
    try {
        const off = offsets.BattleScreen__updateCameraParameters;
        if (!off) return;
        Interceptor.attach(base.add(off), {
            onEnter(args) {
                const bs = args[0];
                if (!bs || bs.isNull()) return;
                _bs = bs;
                _bsTs = Date.now();

                if (!_defaultZoomReported) {
                    try {
                        const z = bs.add(CAM_ZOOM_OFFSET).readFloat();
                        if (isFinite(z) && z > 0) {
                            _defaultZoom = z;
                            try { send({ type: 'CAMERA_DEFAULT_ZOOM', value: z }); } catch (_) {}
                            _defaultZoomReported = true;
                        }
                    } catch (_) {}
                }
                if (!_defaultModeReported) {
                    try {
                        const m = bs.add(CAM_MODE_OFFSET).readS32();
                        if (isFinite(m)) {
                            _defaultMode = m | 0;
                            try { send({ type: 'CAMERA_DEFAULT_MODE', value: m | 0 }); } catch (_) {}
                            _defaultModeReported = true;
                        }
                    } catch (_) {}
                }

                if (!state.camera) return;
                try {
                    bs.add(CAM_MODE_OFFSET).writeS32(_opts.mode | 0);
                    if (_opts.zoomEnabled) {
                        bs.add(CAM_ZOOM_OFFSET).writeFloat(+_opts.zoom);
                    }
                } catch (_) {}
            }
        });
    } catch (_) {}
}
