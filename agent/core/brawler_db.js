import { loadCSV } from "./csv.js";

const BRAWLER_RANGE = {
    0: 2800, 1: 3300, 2: 2000, 3: 3300, 4: 3500, 5: 2800,
    6: 2700, 7: 3300, 8: 2200, 9: 2700, 10: 1100, 11: 1000,
    12: 3200, 13: 2600, 14: 3200, 15: 3700, 16: 3300, 17: 2900,
    18: 2200, 19: 3200, 20: 2200, 21: 2100, 22: 3200, 23: 3500,
    24: 1300, 25: 3100, 26: 1300, 27: 3700, 28: 2200, 29: 3700,
    30: 2400, 31: 2600, 32: 3100, 34: 1200, 35: 3100, 36: 3200,
    37: 1800, 38: 2400, 39: 3200, 40: 3100, 41: 3400, 42: 3700,
    43: 700, 44: 3300, 45: 2800, 46: 3700, 47: 2800, 48: 2800,
    49: 1000, 50: 3100, 51: 1700, 52: 3300, 53: 3300, 54: 1000,
    56: 3400, 57: 1500, 58: 3300, 59: 3300, 60: 1100, 61: 3400,
    62: 2000, 63: 3100, 64: 3300, 65: 3300, 67: 2700, 68: 3200,
    69: 1200, 70: 2000, 71: 1200, 72: 3300, 73: 2400, 74: 3300,
    75: 1500, 76: 1300, 77: 2700, 78: 2900, 79: 3700, 80: 1500,
    81: 700, 82: 2300, 83: 2800, 84: 1800, 85: 1000, 86: 1300,
    87: 2300, 88: 2800, 89: 2300, 90: 2900, 91: 3100, 92: 3100,
    93: 1000, 94: 200, 95: 1200, 98: 3700, 99: 1200,
};

const RANGE_BY_NAME = {
    '8-BIT': 3700, 'ALLI': 200, 'AMBER': 3100, 'ANGELO': 3700,
    'ASH': 1700, 'BARLEY': 2700, 'BEA': 3700, 'BELLE': 3700,
    'BERRY': 2300, 'BIBI': 1300, 'BO': 3200, 'BONNIE': 3300,
    'BROCK': 3300, 'BULL': 2000, 'BUSTER': 2000, 'BUZZ': 1000,
    'BYRON': 3700, 'CARL': 3100, 'CHARLIE': 3300, 'CHESTER': 3100,
    'CHUCK': 2400, 'CLANCY': 2800, 'COLETTE': 3200, 'COLT': 3300,
    'CORDELIUS': 2000, 'CROW': 3200, 'DARRYL': 2200, 'DOUG': 1200,
    'DRACO': 1500, 'DYNAMIKE': 2700, 'EDGAR': 700, 'EL_PRIMO': 1100,
    'EMZ': 2400, 'EVE': 3400, 'FANG': 1000, 'FINX': 3100,
    'FRANK': 2200, 'GALE': 3100, 'GENE': 2100, 'GIGI': 1200,
    'GRAY': 3300, 'GRIFF': 3100, 'GROM': 2800, 'GUS': 3400,
    'HANK': 1200, 'JACKY': 1200, 'JAE': 3100, 'JANET': 1500,
    'JESSIE': 3300, 'JUJU': 2300, 'KAZE': 1000, 'KENJI': 1000,
    'KIT': 1300, 'LARRY_AND_LAWRIE': 2700, 'LEON': 3500, 'LILY': 700,
    'LOLA': 3300, 'LOU': 3400, 'LUMI': 2900, 'MAISIE': 3200,
    'MANDY': 3300, 'MAX': 3100, 'MEEPLE': 2800, 'MEG': 3300,
    'MELODIE': 2900, 'MICO': 1500, 'MOE': 1800, 'MORTIS': 1000,
    'MR_P': 2600, 'NANI': 3200, 'NITA': 2200, 'OLLIE': 2300,
    'OTIS': 3300, 'PAM': 3300, 'PEARL': 3300, 'PENNY': 3200,
    'PIERCE': 3700, 'PIPER': 3700, 'POCO': 2600, 'RICO': 3500,
    'ROSA': 1300, 'RUFFS': 3300, 'SAM': 1100, 'SANDY': 2200,
    'SHADE': 1300, 'SHELLY': 2800, 'SPIKE': 2800, 'SPROUT': 1800,
    'SQUEAK': 2800, 'STU': 2800, 'SURGE': 2400, 'TARA': 2900,
    'TICK': 3200, 'TRUNK': 1200, 'WILLOW': 2700,
};

export const LAUNCHERS = new Set([
    'BARLEY', 'DYNAMIKE', 'TICK', 'SPROUT', 'GROM', 'WILLOW', 'LARRY_AND_LAWRIE', 'BERRY'
]);

export const LAUNCHER_IDS = new Set([6, 9, 22, 37, 48, 67, 77, 82]);

Object.freeze(BRAWLER_RANGE);
Object.freeze(RANGE_BY_NAME);
Object.freeze(LAUNCHERS);
Object.freeze(LAUNCHER_IDS);

export function isLauncher(id, name) {
    return LAUNCHER_IDS.has(id | 0) || (name && LAUNCHERS.has(name));
}

const _CHARS_CSV = "csv_logic/characters.csv";
const _SKILLS_CSV = "csv_logic/skills.csv";
const _PROJ_CSV = "csv_logic/projectiles_logic.csv";

const CHAR_COL_ITEM_NAME = 3;
const CHAR_COL_WEAPON_SKILL = 4;
const SKILL_COL_PROJECTILES = 40;
const PROJ_COL_SPEED = 2;

let _csvAttempted = false;
let _csvProjSpeedByName = null;

function _normName(s) {
    if (!s) return null;
    return String(s).toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_").replace(/&/g, "AND");
}

function _safeStr(row, col) {
    try { return row.getValueAt(col); } catch (_) { return null; }
}

function _safeInt(row, col) {
    try { return row.getIntegerValueAt(col); } catch (_) { return 0; }
}

function _buildIndexByName(table) {
    const map = new Map();
    const n = table.getRowCount();
    for (let i = 0; i < n; i++) {
        const row = table.getRowAt(i);
        if (!row) continue;
        const v = _safeStr(row, 0);
        if (v) map.set(v, row);
    }
    return map;
}

function _buildCSVMaps() {
    if (_csvAttempted) return;
    _csvAttempted = true;

    const chars = loadCSV(_CHARS_CSV);
    const skills = loadCSV(_SKILLS_CSV);
    const projs = loadCSV(_PROJ_CSV);
    if (!chars || !skills || !projs) return;

    const skillsByName = _buildIndexByName(skills);
    const projsByName = _buildIndexByName(projs);
    const projMap = new Map();

    const n = chars.getRowCount();
    for (let i = 0; i < n; i++) {
        const cRow = chars.getRowAt(i);
        if (!cRow) continue;

        const internal = _normName(_safeStr(cRow, 0));
        if (!internal) continue;

        const itemName = _safeStr(cRow, CHAR_COL_ITEM_NAME);
        const itemKey = itemName ? _normName(itemName) : null;
        const keys = [internal];
        if (itemKey && itemKey !== internal) keys.push(itemKey);

        const weaponName = _safeStr(cRow, CHAR_COL_WEAPON_SKILL);
        if (!weaponName) continue;
        const skRow = skillsByName.get(weaponName);
        if (!skRow) continue;

        const projName = _safeStr(skRow, SKILL_COL_PROJECTILES);
        if (!projName) continue;
        const pRow = projsByName.get(projName);
        if (!pRow) continue;

        const speed = _safeInt(pRow, PROJ_COL_SPEED);
        if (speed > 0) for (const k of keys) projMap.set(k, speed);
    }

    if (projMap.size > 0) _csvProjSpeedByName = projMap;
}

export function resolveBrawlerRange(name, id) {
    if (name && RANGE_BY_NAME[name] !== undefined) return RANGE_BY_NAME[name];
    return BRAWLER_RANGE[id | 0] || 0;
}

export function resolveBrawlerProjSpeed(name) {
    _buildCSVMaps();
    if (_csvProjSpeedByName && name) return _csvProjSpeedByName.get(name) || 0;
    return 0;
}
