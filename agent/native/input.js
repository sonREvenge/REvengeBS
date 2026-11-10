import { sha256 } from '@noble/hashes/sha2.js';
import { offsets as o } from './layout.js';
import { valid } from './bindings.js';

function hash(block, message) {
  const input = new Uint8Array(block.length + message.length);
  input.set(block);
  input.set(message, block.length);
  return sha256(input);
}

// Build the token expected by this version of the game
export function inputToken(key, command, constants, innerMask, outerMask) {
  const view = new DataView(command.buffer, command.byteOffset, command.byteLength);
  const type = view.getUint32(4, true);
  const message = new Uint8Array(20);
  message.set(command.subarray(4, 16));
  message.set(command.subarray(0, 4), 12);
  new DataView(message.buffer).setUint32(16, constants[type] ?? 0xdeadbeef, true);
  const block = (mask, pad) => {
    const bytes = new Uint8Array(64).fill(pad);
    for (let i = 0; i < 16; i++) bytes[i] = key[i] ^ mask[i];
    return bytes;
  };
  const digest = hash(block(outerMask, 0x5c), hash(block(innerMask, 0x36), message));
  return Math.max(1, digest[0] | ((digest[1] & 0x7f) << 8));
}

export function createInput(base, native) {
  let constants;
  let inner, outer;
  // Free the input ourselves if the game never receives it
  const free = new NativeFunction(
    Process.getModuleByName('libc.so').getExportByName('free'),
    'void',
    ['pointer'],
  );
  return (_logic, type, fill) => {
    const battle = native.BattleMode_getInstance();
    if (!valid(battle)) return false;
    const manager = battle.add(o.BattleMode_clientInputManager).readPointer();
    if (!valid(manager)) return false;
    const input = native.operator_new(72);
    if (!valid(input)) throw new Error('ClientInput allocation failed');
    let transferred = false;
    try {
      input.writeByteArray(new Uint8Array(72));
      native.ClientInput_constructor_int(input, type);
      fill?.(input);
      if (battle.add(o.BattleMode_hashEnabled).readU8() !== 0) {
        if (!constants) {
          const data = new DataView(
            base.add(o.ClientInput_typeConstantTable).readByteArray(23 * 4),
          );
          const table = Array.from({ length: 23 }, (_, i) => data.getUint32(i * 4, true));
          const innerMask = new Uint8Array(base.add(o.ClientInput_hashInnerMask).readByteArray(16));
          const outerMask = new Uint8Array(base.add(o.ClientInput_hashOuterMask).readByteArray(16));
          constants = table;
          inner = innerMask;
          outer = outerMask;
        }
        const key = new Uint8Array(battle.add(o.BattleMode_hashKey).readByteArray(16));
        const command = new Uint8Array(input.add(4).readByteArray(16));
        input.add(0x34).writeU32(inputToken(key, command, constants, inner, outer));
      }
      native.ClientInputManager_addInput(manager, input);
      transferred = true;
      return true;
    } finally {
      if (!transferred) free(input);
    }
  };
}
