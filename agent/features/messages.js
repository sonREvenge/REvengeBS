import { compatibleOptions, bounded } from '../runtime/options.js';
import { offsets as o } from '../native/layout.js';
import { valid } from '../native/bindings.js';

function emote(nativeName, fallback, slot) {
  return {
    options: compatibleOptions({ intervalMs: bounded(fallback, 100, 5000, true) }),
    create(context, resources, initial) {
      let config = initial,
        lastAt = 0,
        battle = null;
      context.hook(resources, 'LogicBattleModeClient_update', {
        onEnter(args) {
          if (!battle?.equals(args[0])) {
            battle = args[0];
            lastAt = 0;
          }
          const now = Date.now();
          if (now - lastAt < config.intervalMs) return;
          if (nativeName === 'CombatHUD__sendSprayCommand') {
            const live = context.native.BattleMode_getInstance();
            if (!valid(live) || !valid(live.add(o.BattleMode_objectManagerPtr).readPointer()))
              return;
          }
          lastAt = now;
          context.native[nativeName](slot);
        },
      });
      return {
        configure(next) {
          config = next;
        },
      };
    },
  };
}

export const pin = emote('CombatHUD__sendPinCommand', 800, 0);
export const spray = emote('CombatHUD__sendSprayCommand', 600, 10);

export const chatspam = {
  options: compatibleOptions({
    message: {
      default: '',
      valid: (value) => typeof value === 'string',
      convert: (value) => value.slice(0, 128),
    },
    intervalMs: bounded(600, 50, 60000, true),
  }),
  create(context, resources, initial) {
    let config = initial,
      nextAt = 0;
    const free = new NativeFunction(
      Process.getModuleByName('libc.so').getExportByName('free'),
      'void',
      ['pointer'],
    );
    let timer = null;
    const sendOnce = context.log.guard('chat', () => {
      if (!config.message || Date.now() < nextAt) return;
      nextAt = Date.now() + config.intervalMs;
      const manager = context.base.add(o.MessageManager_instance).readPointer();
      if (!valid(manager)) return;
      const message = context.native.operator_new(512);
      if (!valid(message)) throw new Error('TeamChatMessage allocation failed');
      let constructed = false,
        transferred = false;
      try {
        context.native.TeamChatMessage__ctor(message);
        constructed = true;
        context.native.StringCtor(
          message.add(o.TeamChatMessage_messageOffset),
          Memory.allocUtf8String(config.message),
        );
        context.native.MessageManager__sendMessage(manager, message);
        transferred = true;
      } finally {
        if (!transferred) {
          if (constructed)
            context.native.ScString_destruct(message.add(o.TeamChatMessage_messageOffset));
          free(message);
        }
      }
    });
    const restart = () => {
      if (timer !== null) clearInterval(timer);
      timer = setInterval(sendOnce, config.intervalMs);
    };
    resources.own(() => {
      if (timer !== null) clearInterval(timer);
    });
    restart();
    return {
      configure(next) {
        config = next;
        nextAt = 0;
        restart();
      },
    };
  },
};
