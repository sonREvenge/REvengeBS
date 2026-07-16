export function estimateTargetVelocity(xArr, yArr, tArr, maxSpeed = 4000) {
    const empty = {
        vx: 0, vy: 0, ax: 0, ay: 0, speed: 0,
        confident: false, directionChanging: false,
        isJuking: false, angularVelocity: 0
    };

    const n = xArr.length;
    if (n < 2 || tArr.length < 1) return empty;

    let vx = 0, vy = 0, tw = 0;
    let ax = 0, ay = 0, atw = 0;
    let prevVx = 0, prevVy = 0;
    let havePrev = false;

    for (let k = n - 1; k >= 1; k--) {
        const dt = ((k - 1 < tArr.length ? tArr[k - 1] : 0)) / 1000;
        if (dt <= 0.005) continue;
        const invDt = 1 / dt;
        const curVx = (xArr[k] - xArr[k - 1]) * invDt;
        const curVy = (yArr[k] - yArr[k - 1]) * invDt;
        if (Math.abs(curVx) > 7000 || Math.abs(curVy) > 7000) continue;

        const w = k;
        vx += curVx * w;
        vy += curVy * w;
        tw += w;

        if (havePrev) {
            const curAx = (prevVx - curVx) * invDt;
            const curAy = (prevVy - curVy) * invDt;
            if (Math.abs(curAx) < 15000 && Math.abs(curAy) < 15000) {
                ax += curAx * w;
                ay += curAy * w;
                atw += w;
            }
        }
        prevVx = curVx; prevVy = curVy; havePrev = true;
    }

    if (tw > 0) { vx /= tw; vy /= tw; }
    if (atw > 0) { ax /= atw; ay /= atw; }

    let sp = Math.sqrt(vx * vx + vy * vy);
    if (maxSpeed > 0 && sp > maxSpeed && sp > 0.001) {
        const s = maxSpeed / sp;
        vx *= s; vy *= s;
        sp = Math.sqrt(vx * vx + vy * vy);
    }

    let directionChanging = false;
    let angularVelocity = 0;
    if (n >= 4) {
        const mid = n >> 1;
        let rvx = 0, rvy = 0, rtw = 0;
        for (let k = n - 1; k >= mid; k--) {
            const dt = ((k - 1 < tArr.length ? tArr[k - 1] : 0)) / 1000;
            if (dt <= 0.005) continue;
            const w = k - mid + 1;
            rvx += ((xArr[k] - xArr[k - 1]) / dt) * w;
            rvy += ((yArr[k] - yArr[k - 1]) / dt) * w;
            rtw += w;
        }
        let ovx = 0, ovy = 0, otw = 0;
        for (let k = mid; k >= 1; k--) {
            const dt = ((k - 1 < tArr.length ? tArr[k - 1] : 0)) / 1000;
            if (dt <= 0.005) continue;
            const w = mid - k + 1;
            ovx += ((xArr[k] - xArr[k - 1]) / dt) * w;
            ovy += ((yArr[k] - yArr[k - 1]) / dt) * w;
            otw += w;
        }
        if (rtw > 0 && otw > 0) {
            rvx /= rtw; rvy /= rtw;
            ovx /= otw; ovy /= otw;
            const rs = Math.sqrt(rvx * rvx + rvy * rvy);
            const os = Math.sqrt(ovx * ovx + ovy * ovy);
            if (rs > 60 && os > 60) {
                const dot = (rvx * ovx + rvy * ovy) / (rs * os);
                angularVelocity = Math.acos(dot < -1 ? -1 : dot > 1 ? 1 : dot);
                if (dot < 0.55) directionChanging = true;
            }
        }
    }

    return {
        vx, vy, ax, ay, speed: sp,
        confident: n >= 4,
        directionChanging,
        isJuking: directionChanging,
        angularVelocity
    };
}

const BASE_LATENCY_S = 0.080;
const DIST_LATENCY_FACTOR = 0.00001;
const MAX_TTH_S = 1.5;

const MAX_LEAD_UNITS = 2500;

export function solveIntercept(ownX, ownY, targetX, targetY, targetVel, projSpeed) {
    if (projSpeed <= 0) return { x: targetX, y: targetY, time: 0 };
    const vx = targetVel.vx || 0;
    const vy = targetVel.vy || 0;
    const useAccel = targetVel.confident && !targetVel.directionChanging;
    const ax = useAccel ? (targetVel.ax || 0) : 0;
    const ay = useAccel ? (targetVel.ay || 0) : 0;
    const speed = Math.max(projSpeed, 100);
    const invSpeed = 1 / speed;

    let predX = targetX;
    let predY = targetY;
    let tth = 0;

    for (let i = 0; i < 5; i++) {
        const ddx = predX - ownX;
        const ddy = predY - ownY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const latency = BASE_LATENCY_S + dist * DIST_LATENCY_FACTOR;
        tth = dist * invSpeed + latency;
        if (tth > MAX_TTH_S) tth = MAX_TTH_S;
        const halfTSq = 0.5 * tth * tth;
        predX = targetX + vx * tth + ax * halfTSq;
        predY = targetY + vy * tth + ay * halfTSq;
    }

    const leadX = predX - targetX;
    const leadY = predY - targetY;
    const leadDist = Math.sqrt(leadX * leadX + leadY * leadY);
    if (leadDist > MAX_LEAD_UNITS) {
        const s = MAX_LEAD_UNITS / leadDist;
        predX = targetX + leadX * s;
        predY = targetY + leadY * s;
    }
    return { x: predX, y: predY, time: tth };
}
