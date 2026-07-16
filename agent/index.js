import { offsets } from "./core/offsets.js";
import { libg, libc } from "./core/libs.js";
import { initFunctions } from "./core/functions.js";
import { initCSV } from "./core/csv.js";
import { initScanner, updateScanner, resetScannerCache } from "./core/scanner.js";
import { initUtils } from "./utils/utils.js";
import { notifyBattleModeChanged, maybeRefreshWallCache } from "./utils/wallCache.js";
import { setupAimbot, updateAimbot, resetAimbot, setAimbotOptions } from "./features/aimbot.js";
import { setupAutododge, updateAutododge, resetAutododge, setAutododgeOptions, setSpinnerOptions } from "./features/autododge.js";
import { setupName, setTag as setNameTag } from "./features/name.js";
import { setupKillaura, updateKillaura, resetKillaura, setKillauraOptions } from "./features/killaura.js";
import { setupESP, updateESP, resetESP, setESPOptions } from "./features/esp.js";
import { setupIPGrabber, getServerIP } from "./features/ipgrabber.js";
import { setupCamera, setCameraOptions, resetCamera } from "./features/camera.js";
import { setupSpray, updateSpray, setSprayOptions, resetSpray } from "./features/spray.js";
import { setupPin,   updatePin,   setPinOptions,   resetPin   } from "./features/pin.js";
import { setupSpectator, resetSpectator, setBrawlTvOptions, setSpecOptions } from "./features/spectator.js";
import {
    setState, setupSafe, getFlags,
    FLAG_AIMBOT, FLAG_AUTODODGE, FLAG_ESP, FLAG_SPINNER, FLAG_KILLAURA,
    FLAG_CAMERA, FLAG_SPRAY, FLAG_PIN, FLAG_BRAWLTV, FLAG_SPEC,
} from "./utils/flags.js";
import { setLoggingEnabled, logInfo } from "./utils/logger.js";

const _ACTIVE_MASK = FLAG_AIMBOT | FLAG_AUTODODGE | FLAG_ESP | FLAG_SPINNER | FLAG_KILLAURA | FLAG_SPRAY | FLAG_PIN;
const _AIM_OR_KILL = FLAG_AIMBOT | FLAG_KILLAURA;

function startAgent() {
    libg().then((base) => {
        setupSafe('initFunctions', () => initFunctions(base));
        setupSafe('initCSV',       () => initCSV(base));
        setupSafe('initScanner',   () => initScanner(base));

        return libc().then((c) => {
            setupSafe('initUtils', () => initUtils(c));

            setupSafe('camera',     () => setupCamera(base));
            setupSafe('name',       () => setupName(base));
            setupSafe('aimbot',     () => setupAimbot(base));
            setupSafe('autododge',  () => setupAutododge(base));
            setupSafe('killaura',   () => setupKillaura(base));
            setupSafe('esp',        () => setupESP(base));
            setupSafe('spray',      () => setupSpray(base));
            setupSafe('pin',        () => setupPin(base));
            setupSafe('spectator',  () => setupSpectator(base));
            setupSafe('ipgrabber',  () => setupIPGrabber(base));

            let lastBM = null;

            Interceptor.attach(base.add(offsets.LogicBattleModeClient_update), {
                onEnter(args) {
                    try {
                        const bm = args[0];
                        if (!bm || bm.isNull()) return;

                        if (!lastBM || !lastBM.equals(bm)) {
                            lastBM = bm;
                            resetAimbot();
                            resetAutododge();
                            resetESP();
                            resetCamera();
                            resetSpray();
                            resetPin();
                            resetKillaura();
                            resetSpectator();
                            resetScannerCache();
                            notifyBattleModeChanged(bm);
                        }

                        const f = getFlags();
                        if ((f & _ACTIVE_MASK) === 0) return;

                        const now = Date.now();
                        updateScanner(bm, now);
                        maybeRefreshWallCache(bm, now);

                        if (f & _AIM_OR_KILL)   updateAimbot(now);
                        if (f & FLAG_KILLAURA)  updateKillaura(now);
                        if (f & FLAG_AUTODODGE) updateAutododge(now);
                        if (f & FLAG_ESP)       updateESP();
                        if (f & FLAG_SPRAY)     updateSpray(now);
                        if (f & FLAG_PIN)       updatePin(now);
                    } catch (_) {
                        try { send({ type: 'ERROR', code: 3 }); } catch (__) {}
                    }
                }
        });
        });
    }).catch(() => {
        try { send({ type: 'ERROR', code: 1 }); } catch (_) {}
    });
}

let _started = false;

rpc.exports = {
    inithooks() { return true; },

    start() {
        if (_started) return true;
        _started = true;
        startAgent();
        return true;
    },

    togglefeature(feature, value) {
        const ALLOWED = { aimbot: 1, autododge: 1, esp: 1, name: 1, spinner: 1, killaura: 1, camera: 1, spray: 1, pin: 1, brawltv: 1, spec: 1 };
        if (!ALLOWED[feature]) return;
        setState(feature, !!value);
        logInfo('toggle ' + feature + ' = ' + (!!value));
        if (!value) {
            if (feature === 'aimbot')    resetAimbot();
            if (feature === 'autododge') resetAutododge();
            if (feature === 'esp')       resetESP();
            if (feature === 'killaura')  resetKillaura();
            if (feature === 'spray')     resetSpray();
            if (feature === 'pin')       resetPin();
            if (feature === 'brawltv' || feature === 'spec') resetSpectator();
        }
    },

    prepare_unload() {
        resetAimbot();
        resetAutododge();
        resetESP();
        resetCamera();
        resetSpray();
        resetPin();
        resetKillaura();
        resetSpectator();
    },

    getserverip() { return getServerIP(); },

    setnametag(text) { setNameTag(text); },

    setautododgeopts(opts) { setAutododgeOptions(opts); },

    setespopts(opts) { setESPOptions(opts); },

    setaimbotopts(opts) { setAimbotOptions(opts); },

    setkillauraopts(opts) { setKillauraOptions(opts); },

    setcameraopts(opts) { setCameraOptions(opts); },

    setsprayopts(opts) { setSprayOptions(opts); },

    setpinopts(opts) { setPinOptions(opts); },

    setspinneropts(opts) { setSpinnerOptions(opts); },

    setbrawltvopts(opts) { setBrawlTvOptions(opts); },

    setspecopts(opts) { setSpecOptions(opts); },

    setdebug(value) { setLoggingEnabled(value); },
};
