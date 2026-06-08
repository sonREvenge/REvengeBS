import { offsets } from "../core/offsets.js";

let _lastServerIP = null;

function readScString(p) {
    try {
        if (!p || p.isNull()) return null;
        const len = p.add(offsets.ScString_length).readU32();
        if (len === 0 || len > 256) return null;
        const sp = len < 8 ? p.add(offsets.ScString_data) : p.add(offsets.ScString_data).readPointer();
        if (!sp || sp.isNull()) return null;
        return sp.readUtf8String(len);
    } catch (_) { return null; }
}

function isPublicIp(ip) {
    if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 127) return false;
    if (p[0] === 10) return false;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
    if (p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 169 && p[1] === 254) return false;
    if (p[0] >= 224) return false;
    return true;
}

function reportIp(ip, port) {
    const full = ip + ':' + port;
    if (_lastServerIP === full) return;
    _lastServerIP = full;
    send({ type: 'IP_CAPTURED', data: full });
}

export function setupIPGrabber(base) {
    try {
        Interceptor.attach(base.add(offsets.MessageManager__receiveMessage), {
            onEnter: function(args) {
                const msg = this.context.x1;
                if (!msg || msg.isNull()) return;
                try {
                    const port = msg.add(offsets.Message_port).readS32();
                    if (port <= 0 || port > 65535) return;
                    const ipPtr = msg.add(offsets.Message_ipPtr).readPointer();
                    const ip = readScString(ipPtr);
                    if (!isPublicIp(ip)) return;
                    reportIp(ip, port);
                } catch (_) {}
            }
        });
    } catch (_) {}

    try {
        let connectAddr = Module.findExportByName('libc.so', 'connect')
            || Module.findExportByName('libc.so.6', 'connect')
            || Module.findExportByName(null, 'connect');
        if (!connectAddr) return;

        Interceptor.attach(connectAddr, {
            onEnter: function(args) {
                try {
                    const sa = args[1];
                    if (!sa || sa.isNull()) return;
                    if (sa.readU16() !== 2) return;
                    const port = ((sa.add(offsets.SockAddr_portHi).readU8() << 8) | sa.add(offsets.SockAddr_portLo).readU8());
                    if (port <= 1024 || port > 65535) return;
                    const b0 = sa.add(offsets.SockAddr_addr0).readU8();
                    const b1 = sa.add(offsets.SockAddr_addr1).readU8();
                    const b2 = sa.add(offsets.SockAddr_addr2).readU8();
                    const b3 = sa.add(offsets.SockAddr_addr3).readU8();
                    const ip = `${b0}.${b1}.${b2}.${b3}`;
                    if (!isPublicIp(ip)) return;
                    reportIp(ip, port);
                } catch (_) {}
            }
        });
    } catch (_) {}
}

export function getServerIP() {
    return _lastServerIP || 'Not connected';
}
