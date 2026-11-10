import { Resources } from './resources.js';

// Keep feature settings between sessions
export class Controller {
  #features;
  #open;
  #session = null;
  #pending = null;
  #startingResources = null;
  #closing = null;
  #generation = 0;
  #enabled = new Set();
  #instances = new Map();
  #options = new Map();
  #retiring = new Set();
  #deactivating = new Map();

  constructor(features, open) {
    this.#features = features;
    this.#open = open;
  }

  #definition(name) {
    if (!Object.hasOwn(this.#features, name)) throw new Error(`Unknown feature: ${name}`);
    return this.#features[name];
  }

  status() {
    return {
      started: this.#session !== null,
      features: Object.keys(this.#features),
      enabled: [...this.#enabled],
      active: [...this.#instances.keys()],
    };
  }

  configure(name, patch) {
    const definition = this.#definition(name);
    const options = definition.options(patch, this.#options.get(name));
    this.#instances.get(name)?.configure?.(options);
    this.#options.set(name, options);
    return options;
  }

  inspect(callback, fallback) {
    return this.#session ? callback(this.#session.context) : fallback;
  }

  #retire(name, resources) {
    const cleanup = resources.close();
    this.#retiring.add(cleanup);
    this.#deactivating.set(name, cleanup);
    cleanup.then(() => {
      this.#retiring.delete(cleanup);
      if (this.#deactivating.get(name) === cleanup) this.#deactivating.delete(name);
    });
    return cleanup;
  }

  #activate(name) {
    const resources = new Resources();
    try {
      const definition = this.#definition(name);
      const options = this.#options.get(name) ?? definition.options({});
      const instance = definition.create(this.#session.context, resources, options);
      this.#instances.set(name, { ...instance, resources });
    } catch (error) {
      const cleanup = this.#retire(name, resources);
      cleanup.then((errors) => {
        if (errors.length)
          this.#session?.context.log?.failure(
            3,
            `cleanup ${name}`,
            new AggregateError(errors, 'Feature cleanup failed'),
          );
      });
      throw error;
    }
  }

  async toggle(name, enabled) {
    this.#definition(name);
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    const generation = this.#generation;
    if (this.#closing) await this.#closing;
    if (this.#deactivating.has(name)) await this.#deactivating.get(name);
    if (generation !== this.#generation) return this.#enabled.has(name);
    if (this.#enabled.has(name) === enabled) {
      if (enabled && this.#session && !this.#instances.has(name)) this.#activate(name);
      return enabled;
    }
    if (enabled) {
      if (this.#session) this.#activate(name);
      this.#enabled.add(name);
    } else {
      const instance = this.#instances.get(name);
      this.#instances.delete(name);
      this.#enabled.delete(name);
      let errors = [];
      if (instance) {
        errors = await this.#retire(name, instance.resources);
      }
      if (errors.length) throw new AggregateError(errors, `Could not fully disable ${name}`);
    }
    return enabled;
  }

  start() {
    if (this.#closing) return this.#closing.then(() => this.start());
    if (this.#session) return Promise.resolve(true);
    if (this.#pending) return this.#pending;
    const generation = this.#generation;
    const resources = new Resources();
    this.#startingResources = resources;
    const pending = Promise.resolve()
      .then(() => this.#open(resources))
      .then((context) => {
        if (generation !== this.#generation) throw new Error('Start cancelled');
        this.#session = { context, resources };
        this.#startingResources = null;
        for (const name of this.#enabled) {
          try {
            this.#activate(name);
          } catch (error) {
            context.log?.failure(2, `setup ${name}`, error);
          }
        }
        return true;
      })
      .catch(async (error) => {
        for (const instance of this.#instances.values()) await instance.resources.close();
        this.#instances.clear();
        this.#session = null;
        await resources.close();
        throw error;
      })
      .finally(() => {
        if (this.#pending === pending) this.#pending = null;
        if (this.#startingResources === resources) this.#startingResources = null;
      });
    this.#pending = pending;
    return pending;
  }

  stop() {
    if (this.#closing) return this.#closing;
    this.#generation++;
    const errors = [];
    const cleanup = [
      ...this.#retiring,
      ...[...this.#instances.values()].map((instance) => instance.resources.close()),
    ];
    if (this.#startingResources) cleanup.push(this.#startingResources.close());
    this.#instances.clear();
    this.#enabled.clear();
    const session = this.#session;
    this.#session = null;
    const pending = this.#pending;
    this.#closing = Promise.all(cleanup)
      .then(async (results) => {
        if (session) results.push(await session.resources.close());
        for (const result of results) errors.push(...result);
        if (pending) await pending.catch(() => {});
        // Wait for startup to finish cancelling
        if (errors.length) throw new AggregateError(errors, 'Agent cleanup failed');
        return true;
      })
      .finally(() => {
        this.#closing = null;
      });
    return this.#closing;
  }
}
