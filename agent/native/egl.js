import { findExport, findModule } from './module.js';
import { valid } from './bindings.js';
const pinnedCallbacks = new Set();

export function decodeGot(plt) {
  const page = plt.readU32(),
    load = plt.add(4).readU32();
  if (((page >>> 24) & 159) !== 144) return null;
  const immediate = (((page >>> 5) & 0x7ffff) << 2) | ((page >>> 29) & 3);
  const signed = immediate & 0x100000 ? immediate - 0x200000 : immediate;
  return plt.and(ptr('0xfffffffffffff000')).add(signed * 4096 + ((load >>> 10) & 0xfff) * 8);
}

function replaceImport(address, dispatch, log) {
  const engine = findModule('libg.so');
  if (!engine) return null;
  let entry;
  try {
    entry = engine.enumerateImports?.().find((entry) => entry.name === 'eglSwapBuffers');
  } catch (error) {
    log.error('EGL imports', error);
  }
  let slot = null;
  try {
    const candidate = entry && decodeGot(entry.address);
    if (candidate?.readPointer().equals(address)) slot = candidate;
  } catch {
    /* Some builds expose a direct import rather than a PLT stub */
  }
  if (!slot) {
    const bytes = Memory.alloc(8);
    bytes.writePointer(address);
    const pattern = Array.from(new Uint8Array(bytes.readByteArray(8)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(' ');
    for (const protection of ['r--', 'rw-']) {
      for (const range of Process.enumerateRanges(protection)) {
        if (
          range.base.compare(engine.base) < 0 ||
          range.base.compare(engine.base.add(engine.size)) >= 0
        )
          continue;
        slot = Memory.scanSync(range.base, range.size, pattern)[0]?.address;
        if (slot) break;
      }
      if (slot) break;
    }
  }
  if (!slot) return null;
  const original = new NativeFunction(address, 'uint', ['pointer', 'pointer']);
  const callback = new NativeCallback(
    (display, surface) => {
      dispatch(display, surface);
      return original(display, surface);
    },
    'uint',
    ['pointer', 'pointer'],
  );
  const protection = Process.findRangeByAddress(slot)?.protection ?? 'r--';
  const writable = () => {
    if (!Memory.protect(slot, 8, 'rw-')) throw new Error('Cannot write the EGL import');
  };
  const restoreProtection = () => {
    try {
      if (!Memory.protect(slot, 8, protection))
        throw new Error('Cannot restore EGL import protection');
    } catch (error) {
      log.error('EGL protection', error);
    }
  };
  writable();
  try {
    slot.writePointer(callback);
    pinnedCallbacks.add(callback);
  } finally {
    restoreProtection();
  }
  return () => {
    // Keep the callback alive until its import slot has been restored
    if (slot.readPointer().equals(callback)) {
      writable();
      try {
        slot.writePointer(address);
        pinnedCallbacks.delete(callback);
      } finally {
        restoreProtection();
      }
    } else pinnedCallbacks.delete(callback);
  };
}

export function createEgl(resources, log) {
  const listeners = new Set();
  let detach = null,
    swapInterval = null,
    getContext = null,
    closed = false;
  const dispatch = (display, surface) => {
    if (closed) return;
    for (const callback of listeners) {
      try {
        callback(display, surface);
      } catch (error) {
        log.error('EGL callback', error);
      }
    }
  };
  function install() {
    if (detach || closed || !listeners.size) return;
    const address = findExport('eglSwapBuffers');
    if (!address) return;
    try {
      const listener = Interceptor.attach(address, {
        onEnter(args) {
          dispatch(args[0], args[1]);
        },
      });
      detach = () => listener.detach();
    } catch (error) {
      detach = replaceImport(address, dispatch, log);
      if (!detach) log.error('EGL hook', error);
    }
  }
  resources.interval(log.guard('EGL load', install), 250);
  resources.own(() => {
    closed = true;
    try {
      detach?.();
    } finally {
      listeners.clear();
    }
  });
  return {
    subscribe(owner, callback) {
      owner.own(() => listeners.delete(callback));
      listeners.add(callback);
      install();
    },
    context() {
      if (!getContext) {
        const address = findExport('eglGetCurrentContext');
        if (!address) return null;
        getContext = new NativeFunction(address, 'pointer', []);
      }
      return getContext();
    },
    interval(display, value) {
      if (!valid(display)) return false;
      if (!swapInterval) {
        const address = findExport('eglSwapInterval');
        if (!address) return false;
        swapInterval = new NativeFunction(address, 'int', ['pointer', 'int']);
      }
      return !!swapInterval(display, value);
    },
  };
}
