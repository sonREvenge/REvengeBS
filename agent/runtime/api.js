export function createApi(controller, features, log) {
  const api = {
    ping: () => true,
    async start() {
      try {
        return await controller.start();
      } catch (error) {
        log.failure(1, 'agent start', error);
        throw error;
      }
    },
    async stop() {
      try {
        return await controller.stop();
      } finally {
        log.flush();
      }
    },
    async prepareUnload() {
      try {
        await api.stop();
      } catch (error) {
        log.failure(3, 'agent unload', error);
      }
    },
    status: () => ({ apiVersion: 1, ...controller.status() }),
    async togglefeature(name, value) {
      if (!Object.hasOwn(features, name)) return;
      try {
        const enabled = await controller.toggle(name, !!value);
        log.info('toggle ' + name, { enabled });
      } catch (error) {
        log.failure(value ? 2 : 3, `${value ? 'setup' : 'cleanup'} ${name}`, error);
      }
    },
    configure(name, patch) {
      const result = controller.configure(name, patch);
      log.info(name + ' options', result);
      return result;
    },
    async getserverip() {
      if (!controller.status().started) return 'Not connected';
      await api.togglefeature('ipgrabber', true);
      return controller.inspect((context) => context.serverIP || 'Not connected', 'Not connected');
    },
    listgradients() {
      try {
        return controller.inspect((context) => features.gradient.query(context), []);
      } catch (error) {
        log.error('gradient catalogue', error);
        return [];
      }
    },
    setdebug(value) {
      log.setDebug(!!value);
    },
  };
  for (const name of Object.keys(features))
    api[`set${name}opts`] = (patch) => {
      api.configure(name, patch);
    };
  return api;
}
