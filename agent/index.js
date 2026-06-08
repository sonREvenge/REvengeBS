import { offsets } from "./core/offsets.js";
import { libg, libc } from "./core/libs.js";
import { initFunctions } from "./core/functions.js";
import { initCSV } from "./core/csv.js";
import { initScanner, updateScanner, resetScannerCache } from "./core/scanner.js";
import { initUtils } from "./utils/utils.js";
import { notifyBattleModeChanged } from "./utils/wallCache.js";
import { setupAimbot, updateAimbot, resetAimbot } from "./features/aimbot.js";
import { setupAutododge, updateAutododge, resetAutododge } from "./features/autododge.js";
import { setupName, setTag as setNameTag } from "./features/name.js";
import { setupKillaura, updateKillaura } from "./features/killaura.js";
import { setupESP, updateESP, resetESP } from "./features/esp.js";
import { setupIPGrabber, getServerIP } from "./features/ipgrabber.js";
import {
    setState, setupSafe, getFlags,
    FLAG_AIMBOT, FLAG_AUTODODGE, FLAG_ESP, FLAG_SPINNER, FLAG_KILLAURA,
} from "./utils/flags.js";
import { setLoggingEnabled } from "./utils/logger.js";

const _ACTIVE_MASK = FLAG_AIMBOT | FLAG_AUTODODGE | FLAG_ESP | FLAG_SPINNER | FLAG_KILLAURA;
const _AIM_OR_KILL = FLAG_AIMBOT | FLAG_KILLAURA;

function startAgent() {
    libg().then((base) => {
        setupSafe('initFunctions', () => initFunctions(base));
        setupSafe('initCSV',       () => initCSV(base));
        setupSafe('initScanner',   () => initScanner(base));

        return libc().then((c) => {
            setupSafe('initUtils', () => initUtils(c));

            setupSafe('name',       () => setupName(base));
            setupSafe('aimbot',     () => setupAimbot(base));
            setupSafe('autododge',  () => setupAutododge(base));
            setupSafe('killaura',   () => setupKillaura(base));
            setupSafe('esp',        () => setupESP(base));
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
                            resetScannerCache();
                            notifyBattleModeChanged(bm);
                        }

                        const f = getFlags();
                        if ((f & _ACTIVE_MASK) === 0) return;

                        const now = Date.now();
                        updateScanner(bm, now);

                        if (f & _AIM_OR_KILL)   updateAimbot(now);
                        if (f & FLAG_KILLAURA)  updateKillaura(now);
                        if (f & FLAG_AUTODODGE) updateAutododge(now);
                        if (f & FLAG_ESP)       updateESP();
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
        const ALLOWED = { aimbot: 1, autododge: 1, esp: 1, name: 1, spinner: 1, killaura: 1 };
        if (!ALLOWED[feature]) return;
        setState(feature, !!value);
        if (!value) {
            if (feature === 'aimbot')    resetAimbot();
            if (feature === 'autododge') resetAutododge();
            if (feature === 'esp')       resetESP();
        }
    },

    prepare_unload() {
        resetAimbot();
        resetAutododge();
        resetESP();
    },

    getserverip() { return getServerIP(); },

    setnametag(text) { setNameTag(text); },

    setdebug(value) { setLoggingEnabled(value); },
};
