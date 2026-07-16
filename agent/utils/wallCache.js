import { offsets } from "../core/offsets.js";
import { getFunctions } from "../core/functions.js";

let g_wall = null;
let g_wallW = 0;
let g_wallH = 0;
let g_builtForPtr = null;
let g_lastBuildTs = 0;
let g_lastFastRescanTs = 0;
let g_gen = 0;
let g_destructibleIdx = null;
let g_tilesArr = null;

const FAST_RESCAN_MS = 500;
const FULL_REBUILD_MS = 15000;

function _fullRebuild(tm) {
    if (!tm || tm.isNull()) return false;

    const w = tm.add(offsets.TileMap_Width).readS32();
    const h = tm.add(offsets.TileMap_Height).readS32();
    if (w <= 0 || w > 120 || h <= 0 || h > 120) return false;
    const tilesArr = tm.add(offsets.TileMap_TilesArray).readPointer();
    if (tilesArr.isNull()) return false;

    const total = w * h;
    if (total <= 0 || total > 14400) return false;

    const ps = Process.pointerSize;
    const blkOff = offsets.TileTypeData_BlocksMovement;
    const out = new Uint8Array(total);
    const dest = [];

    for (let i = 0; i < total; i++) {
        const tile = tilesArr.add(i * ps).readPointer();
        if (tile.isNull()) { out[i] = 0; continue; }
        const ttype = tile.readPointer();
        if (ttype.isNull()) { out[i] = 0; continue; }
        const flags = ttype.add(blkOff).readU16();
        const blocksMove = (flags & 0xff) ? 0x80 : 0;
        const blocksProj = ((flags >> 8) & 0xff) ? 0x40 : 0;
        const packed = blocksMove | blocksProj;
        out[i] = packed;
        if (packed !== 0) dest.push(i);
    }

    g_wall = out;
    g_wallW = w;
    g_wallH = h;
    g_builtForPtr = tm;
    g_tilesArr = tilesArr;
    g_destructibleIdx = dest;
    g_lastBuildTs = Date.now();
    g_lastFastRescanTs = g_lastBuildTs;
    g_gen++;
    return true;
}

function _fastRescan() {
    if (!g_wall || !g_destructibleIdx || !g_tilesArr || g_tilesArr.isNull()) return;
    const ps = Process.pointerSize;
    const blkOff = offsets.TileTypeData_BlocksMovement;
    const tilesArr = g_tilesArr;
    const wall = g_wall;
    const dest = g_destructibleIdx;
    let changed = false;
    let writeIdx = 0;

    for (let n = 0; n < dest.length; n++) {
        const i = dest[n];
        let packed = 0;
        try {
            const tile = tilesArr.add(i * ps).readPointer();
            if (!tile.isNull()) {
                const ttype = tile.readPointer();
                if (!ttype.isNull()) {
                    const flags = ttype.add(blkOff).readU16();
                    const blocksMove = (flags & 0xff) ? 0x80 : 0;
                    const blocksProj = ((flags >> 8) & 0xff) ? 0x40 : 0;
                    packed = blocksMove | blocksProj;
                }
            }
        } catch (_) { packed = 0; }

        if (wall[i] !== packed) {
            wall[i] = packed;
            changed = true;
        }
        if (packed !== 0) dest[writeIdx++] = i;
    }
    if (writeIdx !== dest.length) {
        dest.length = writeIdx;
        changed = true;
    }
    if (changed) g_gen++;
    g_lastFastRescanTs = Date.now();
}

export function notifyBattleModeChanged(bm) {
    if (!bm || bm.isNull()) return;
    try {
        const tm = getFunctions().LogicBattleModeClient_getTileMap(bm);
        if (tm && !tm.isNull()) _fullRebuild(tm);
    } catch (_) {}
}

export function maybeRefreshWallCache(bm, now) {
    if (!bm || bm.isNull()) return;
    if (now === undefined) now = Date.now();
    if (!g_wall) {
        try {
            const tm = getFunctions().LogicBattleModeClient_getTileMap(bm);
            if (tm && !tm.isNull()) _fullRebuild(tm);
        } catch (_) {}
        return;
    }
    if (now - g_lastBuildTs >= FULL_REBUILD_MS) {
        try {
            const tm = getFunctions().LogicBattleModeClient_getTileMap(bm);
            if (tm && !tm.isNull()) { _fullRebuild(tm); return; }
        } catch (_) {}
    }
    if (now - g_lastFastRescanTs >= FAST_RESCAN_MS) {
        _fastRescan();
    }
}

export function getWallCache()    { return g_wall;  }
export function getWallCacheW()   { return g_wallW; }
export function getWallCacheH()   { return g_wallH; }
export function getWallCacheGen() { return g_gen;   }

export function losCheck(wx0, wy0, wx1, wy1, checkBit) {
    const wall = g_wall;
    if (!wall) return true;
    const w = g_wallW, h = g_wallH;
    let cx = (wx0 / 300) | 0;
    let cy = (wy0 / 300) | 0;
    const tx = (wx1 / 300) | 0;
    const ty = (wy1 / 300) | 0;
    if (cx === tx && cy === ty) return true;

    const dx = Math.abs(tx - cx);
    const dy = -Math.abs(ty - cy);
    const sx = cx < tx ? 1 : -1;
    const sy = cy < ty ? 1 : -1;
    let err = dx + dy;
    const maxSteps = dx + (-dy) + 2;

    for (let n = 0; n < maxSteps; n++) {
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; cx += sx; }
        if (e2 <= dx) { err += dx; cy += sy; }
        if (cx === tx && cy === ty) return true;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        if (wall[cy * w + cx] & checkBit) return false;
    }
    return true;
}

export function traceWallHit(wx, wy, dirX, dirY, maxDist, checkBit) {
    const wall = g_wall;
    if (!wall || maxDist <= 0) return maxDist;
    const w = g_wallW, h = g_wallH;
    if (w <= 0 || h <= 0) return maxDist;

    const stepSize = 40;
    const inv = 1 / 300;
    let dist = 0;
    while (dist < maxDist) {
        dist += stepSize;
        if (dist > maxDist) dist = maxDist;
        const tx = ((wx + dirX * dist) * inv) | 0;
        const ty = ((wy + dirY * dist) * inv) | 0;
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) {
            return Math.max(0, dist - 75);
        }
        if (wall[ty * w + tx] & checkBit) {
            return Math.max(0, dist - 75);
        }
    }
    return maxDist;
}
