export function createLogger(emit = (message) => send(message), clock = Date.now) {
  let debug = false,
    timer = null,
    pending = [];
  const deadlines = new Map();
  function deliver(message) {
    try {
      emit(message);
    } catch {
      /* The host may already be unloading */
    }
  }
  function flush() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending.length) return;
    const entries = pending;
    pending = [];
    deliver({ type: 'LOG_BATCH', entries });
  }
  function entry(level, message, data) {
    if (!debug) return;
    pending.push({
      lvl: level,
      msg: String(message ?? ''),
      ...(data === undefined ? {} : { data }),
    });
    if (pending.length >= 32) flush();
    else if (timer === null) timer = setTimeout(flush, 100);
  }
  function failure(code, context, cause) {
    deliver({ type: 'ERROR', code, text: `${context}: ${cause?.message ?? cause}` });
  }
  function error(context, cause) {
    const now = clock();
    if (now < (deadlines.get(context) ?? 0)) return;
    deadlines.set(context, now + 2000);
    failure(3, context, cause);
  }
  return {
    failure,
    error,
    flush,
    reset() {
      deadlines.clear();
    },
    setDebug(value) {
      debug = !!value;
      if (debug) entry('debug', 'agent logging enabled');
      else {
        flush();
        deadlines.clear();
      }
    },
    info(message, data) {
      entry('info', message, data);
    },
    warn(message, data) {
      entry('warn', message, data);
    },
    guard(context, callback) {
      return function (...args) {
        try {
          return callback.apply(this, args);
        } catch (cause) {
          error(context, cause);
        }
      };
    },
  };
}
