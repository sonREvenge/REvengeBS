import { compatibleOptions } from '../runtime/options.js';

export function parseEndpoint(value) {
  const match = /^([a-f\d]{8}):([a-f\d]{1,4})$/i.exec(value);
  if (!match) return null;
  const octets = match[1]
      .match(/../g)
      .map((byte) => parseInt(byte, 16))
      .reverse(),
    port = parseInt(match[2], 16);
  return port > 0 && port <= 65535 ? { ip: octets.join('.'), port } : null;
}
export function publicIpv4(ip) {
  const octets = String(ip).split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return false;
  const [a, b] = octets;
  return (
    a !== 0 &&
    a !== 127 &&
    a !== 10 &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && b === 168) &&
    !(a === 169 && b === 254) &&
    a < 224
  );
}
export function findEndpoint(text) {
  for (const line of text.split(/\r?\n/).slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 4 || fields[3] !== '01') continue;
    const endpoint = parseEndpoint(fields[2]);
    if (endpoint && publicIpv4(endpoint.ip) && endpoint.port !== 80 && endpoint.port !== 443)
      return `${endpoint.ip}:${endpoint.port}`;
  }
  return null;
}
export const ipgrabber = {
  options: compatibleOptions({}),
  create(context, resources) {
    let timer = null;
    function scan() {
      try {
        const endpoint = findEndpoint(File.readAllText('/proc/self/net/tcp'));
        if (!endpoint) return;
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }
        if (context.serverIP !== endpoint) {
          context.serverIP = endpoint;
          send({ type: 'IP_CAPTURED', data: endpoint });
        }
      } catch (error) {
        context.log.error('endpoint scan', error);
      }
    }
    scan();
    if (!context.serverIP) timer = setInterval(scan, 1000);
    resources.own(() => {
      if (timer !== null) clearInterval(timer);
    });
    return {};
  },
};
