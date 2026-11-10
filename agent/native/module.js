import { valid } from './bindings.js';
const attempt = (callback, fallback = null) => {
  try {
    return callback();
  } catch {
    return fallback;
  }
};

export function findModule(name) {
  const loaded = attempt(() => Process.findModuleByName(name));
  if (loaded) return loaded;
  let ranges = [];
  try {
    ranges = Process.enumerateRanges({ protection: 'r--', coalesce: false });
  } catch {
    /* Fall back to proc mappings */
  }
  for (const range of ranges) {
    if (
      range.file?.offset !== 0 ||
      !range.file.path.toLowerCase().endsWith('/' + name.toLowerCase())
    )
      continue;
    return { name, path: range.file.path, base: range.base, size: range.size };
  }
  try {
    const mappings = File.readAllText('/proc/self/maps').trim().split('\n');
    const rows = mappings
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) =>
        parts
          .at(-1)
          ?.toLowerCase()
          .endsWith('/' + name.toLowerCase()),
      );
    const first = rows.find((parts) => /^0+$/.test(parts[2]));
    if (first) {
      const base = ptr('0x' + first[0].split('-')[0]);
      const end = ptr('0x' + rows.at(-1)[0].split('-')[1]);
      return { name, path: first.at(-1), base, size: end.sub(base).toUInt32() };
    }
  } catch {
    /* Mappings may not be readable while the process is starting */
  }
  return null;
}

export function findExport(name, libraries = ['libEGL.so', 'libEGL.so.1']) {
  const modules = [
    ...libraries.map((name) => attempt(() => Process.findModuleByName(name))),
    ...attempt(() => Process.enumerateModules(), []).filter((module) =>
      /libEGL(?:\.so(?:\.\d+)?)?$/i.test(module.name),
    ),
  ];
  for (const module of modules) {
    const address = attempt(() => module?.findExportByName?.(name));
    if (valid(address)) return address;
  }
  for (const library of libraries) {
    const mapped = findModule(library);
    const module = mapped && attempt(() => Process.findModuleByAddress(mapped.base));
    const address = attempt(() => module?.findExportByName?.(name));
    if (valid(address)) return address;
  }
  const address = attempt(() =>
    typeof Module.findGlobalExportByName === 'function'
      ? Module.findGlobalExportByName(name)
      : Module.findExportByName(null, name),
  );
  if (valid(address)) return address;
  if (name.startsWith('gl')) {
    const lookup = findExport('eglGetProcAddress');
    if (lookup) {
      const resolved = new NativeFunction(lookup, 'pointer', ['pointer'])(
        Memory.allocUtf8String(name),
      );
      if (valid(resolved)) return resolved;
    }
  }
  return null;
}

export function waitForEngine(resources, { timeoutMs = Infinity, intervalMs = 50 } = {}) {
  if (Process.arch !== 'arm64' || Process.pointerSize !== 8)
    throw new Error('Android arm64 is required');
  return new Promise((resolve, reject) => {
    let settled = false,
      timer = null;
    const deadline = Date.now() + timeoutMs;
    function finish(error, module) {
      if (settled) return;
      settled = true;
      if (timer !== null) clearInterval(timer);
      if (error) reject(error);
      else resolve(module);
    }
    resources.own(() => finish(new Error('Start cancelled')));
    function poll() {
      try {
        const module = findModule('libg.so');
        if (module) finish(null, module);
        else if (Date.now() >= deadline) finish(new Error('libg.so load timed out'));
      } catch (error) {
        finish(error);
      }
    }
    poll();
    if (!settled) timer = setInterval(poll, intervalMs);
  });
}
