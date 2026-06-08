import { losCheck } from "../utils/wallCache.js";
import { state } from "../utils/flags.js";
import { offsets } from "../core/offsets.js";
import { scanData } from "../core/scanner.js";
import { isLauncher, resolveBrawlerRange } from "../core/brawler_db.js";
import { computeAimForTarget, getSharedBattleScreen, getSharedBattleScreenTs } from "./aimbot.js";

const CFG = {
    ERROR_COOLDOWN_MS:        2000,
    BATTLE_SCREEN_MAX_AGE_MS: 200,
    FIRE_INTERVAL_MS:         1000,
};

let _errorUntil = 0;
let _wrapperFn  = null;
let _lastFireMs = 0;

export function updateKillaura(now) {
    const _battleScreen = getSharedBattleScreen();
    if (!state.killaura || !_battleScreen) return;
    if (now === undefined) now = Date.now();
    if (now < _errorUntil) return;
    if (now - scanData.lastUpdate > 500) return;
    if (now - getSharedBattleScreenTs() > CFG.BATTLE_SCREEN_MAX_AGE_MS) return;
    if (now - _lastFireMs < CFG.FIRE_INTERVAL_MS) return;

    try {
        const myX = scanData.myX, myY = scanData.myY;
        const own = scanData.ownCharacter;
        if (!own || own.isNull()) return;

        const range = resolveBrawlerRange(scanData.myBrawlerName, scanData.myBrawlerId);
        if (range <= 0) return;
        const rangeSq = range * range;

        let bestDist = 1e18, bestX = 0, bestY = 0, bestGid = null, found = false;
        for (const e of (scanData.enemies || [])) {
            const dx = e.x - myX, dy = e.y - myY, d2 = dx * dx + dy * dy;
            if (d2 >= rangeSq || d2 >= bestDist) continue;
            if (!isLauncher(scanData.myBrawlerId, scanData.myBrawlerName) && !losCheck(myX, myY, e.x, e.y, 0x40)) continue;
            bestDist = d2; bestX = e.x; bestY = e.y; bestGid = e.gid; found = true;
        }

        if (!found) return;

        let fireX = bestX, fireY = bestY;
        const aim = computeAimForTarget(bestGid, myX, myY);
        if (aim) { fireX = aim.x; fireY = aim.y; }

        _battleScreen.add(offsets.BattleScreen_manualFireX).writeS32(fireX);
        _battleScreen.add(offsets.BattleScreen_manualFireY).writeS32(fireY);
        _battleScreen.add(offsets.BattleScreen_autoFireX).writeS32(fireX);
        _battleScreen.add(offsets.BattleScreen_autoFireY).writeS32(fireY);
        _battleScreen.add(offsets.BattleScreen_autoshootPredOff).writeS32(0);
        _wrapperFn(_battleScreen, own);
        _lastFireMs = now;
    } catch (e) {
        _errorUntil = Date.now() + CFG.ERROR_COOLDOWN_MS;
    }
}

export function setupKillaura(base) {
    _wrapperFn = new NativeFunction(base.add(offsets.BattleScreen_fireWrapperFn), 'int', ['pointer', 'pointer']);
}
