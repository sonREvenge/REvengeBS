export class Resources {
  #cleanup = [];
  #closed = false;
  #closing = null;

  own(dispose) {
    if (this.#closed) throw new Error('Session is closed');
    this.#cleanup.push(dispose);
    return dispose;
  }

  attach(address, callbacks) {
    if (this.#closed) throw new Error('Session is closed');
    const owner = this;
    const guarded = Object.fromEntries(
      Object.entries(callbacks).map(([phase, callback]) => [
        phase,
        function (...args) {
          if (!owner.#closed) return callback.apply(this, args);
        },
      ]),
    );
    const listener = Interceptor.attach(address, guarded);
    try {
      this.own(() => listener.detach());
    } catch (error) {
      listener.detach();
      throw error;
    }
    return listener;
  }

  interval(callback, milliseconds) {
    if (this.#closed) throw new Error('Session is closed');
    const id = setInterval(callback, milliseconds);
    this.own(() => clearInterval(id));
    return id;
  }

  close() {
    if (this.#closing) return this.#closing;
    this.#closed = true;
    let finish;
    this.#closing = new Promise((resolve) => {
      finish = resolve;
    });
    const errors = [];
    const pending = [];
    const cleanup = this.#cleanup;
    this.#cleanup = [];
    for (const dispose of cleanup.reverse()) {
      try {
        const result = dispose();
        if (result !== this.#closing)
          pending.push(Promise.resolve(result).catch((error) => errors.push(error)));
      } catch (error) {
        errors.push(error);
      }
    }
    Promise.all(pending).then(() => finish(errors));
    return this.#closing;
  }
}
