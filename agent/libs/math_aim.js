export function estimateTargetVelocity(xArr, yArr, tArr, maxSpeed = 4000) {
    const empty = {
        vx: 0, vy: 0, speed: 0, confident: false,
        directionChanging: false, isJuking: false,
        angularVelocity: 0
    };

    const n = xArr.length;
    if (n < 2 || tArr.length < 1) return empty;

    let vx = 0, vy = 0, tw = 0;
    for (let k = n - 1; k >= 1; k--) {
        const dt = ((k - 1 < tArr.length ? tArr[k - 1] : 0)) / 1000;
        if (dt <= 0.005) continue;
        const w = k;
        vx += ((xArr[k] - xArr[k - 1]) / dt) * w;
        vy += ((yArr[k] - yArr[k - 1]) / dt) * w;
        tw += w;
    }
    if (tw > 0) { vx /= tw; vy /= tw; }
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
        vx, vy, speed: sp,
        confident: n >= 4,
        directionChanging,
        isJuking: directionChanging,
        angularVelocity
    };
}

export function solveIntercept(ownX, ownY, targetX, targetY, targetVel, projSpeed) {
    if (projSpeed <= 0) return { x: targetX, y: targetY, time: 0 };
    let predX = targetX, predY = targetY, tth = 0;
    for (let i = 0; i < 4; i++) {
        const ddx = predX - ownX, ddy = predY - ownY;
        tth = Math.sqrt(ddx * ddx + ddy * ddy) / projSpeed;
        predX = targetX + targetVel.vx * tth;
        predY = targetY + targetVel.vy * tth;
    }
    return { x: predX, y: predY, time: tth };
}
