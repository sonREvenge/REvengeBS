import { compatibleOptions } from '../runtime/options.js';
import { scene, fieldKind } from '../native/ui.js';
import { valid, withString, readString } from '../native/bindings.js';
import { offsets as o } from '../native/layout.js';

export function listGradients(context) {
  return withString(context.native, 'csv_client/color_gradients.csv', (name) => {
    const resource = context.native.ResourceManager__getCSV(name);
    if (!valid(resource)) return [];
    const table = resource.readPointer();
    if (!valid(table)) return [];
    const count = table.add(84).readS32();
    if (count < 0 || count > 512) throw new Error('Invalid gradient table length');
    const rows = table.add(72).readPointer();
    if (!valid(rows)) return [];
    const names = [];
    for (let i = 0; i < count; i++) {
      const row = rows.add(i * 8).readPointer();
      if (!valid(row)) continue;
      const value = readString(context.native.CSVRow__getName(row));
      if (value) names.push(value);
    }
    return names;
  });
}

export const gradient = {
  query: listGradients,
  options: compatibleOptions({
    name: { default: '', valid: (value) => typeof value === 'string' },
  }),
  create(context, resources, initial) {
    let config = initial,
      selected = null,
      selectedName = null,
      applying = false,
      lastWalk = 0;
    const originals = new Map(),
      pending = new Set(),
      hidden = new Map();
    function remember(field, original) {
      if (originals.size >= 128 && !originals.has(field.toString())) return;
      if (fieldKind(context.base, field) !== 'decorated') return;
      const text = readString(field.add(o.DecoratedTextField_text));
      if (originals.get(field.toString())?.text === text) return;
      originals.set(field.toString(), {
        text,
        gradient: original ?? field.add(o.DecoratedTextField_gradient).readPointer(),
      });
    }
    function resolve() {
      if (selectedName === config.name && selected) return;
      selected = null;
      if (!config.name) return;
      const table = context.base
        .add(o.LogicDataTables_tableArray)
        .add(o.GRADIENT_TABLE_INDEX * 8)
        .readPointer();
      if (!valid(table)) return;
      const address = table.readPointer().add(o.LogicDataTable_findByName).readPointer();
      if (!valid(address)) return;
      const find = new NativeFunction(address, 'pointer', ['pointer', 'pointer', 'pointer']);
      const value = withString(context.native, config.name, (name) => find(table, name, ptr(0)));
      if (valid(value)) {
        selected = value;
        selectedName = config.name;
      }
    }
    function decorate(field, value, text) {
      if (text === null) return null;
      applying = true;
      try {
        return withString(context.native, text, (str) =>
          context.native.Name_setupDecorated(field, str, value),
        );
      } finally {
        applying = false;
      }
    }
    function apply(restore = false) {
      if (applying) return;
      const requested = new Set(pending);
      pending.clear();
      if (!restore) resolve();
      const nodes = scene(context),
        byAddress = new Map(nodes.map((node) => [node.pointer.toString(), node]));
      for (const [address, record] of hidden)
        if (byAddress.get(address)?.text !== record.text) hidden.delete(address);
      for (const [address, record] of originals) {
        const node = byAddress.get(address);
        if (!node || node.kind !== 'decorated' || node.text !== record.text) {
          originals.delete(address);
          continue;
        }
        const wanted = !restore && selected ? selected : record.gradient;
        if (!node.pointer.add(o.DecoratedTextField_gradient).readPointer().equals(wanted))
          decorate(node.pointer, wanted, node.text);
      }
      if (restore) {
        for (const [address, record] of hidden) {
          const node = byAddress.get(address);
          if (node?.text === record.text)
            node.pointer.add(o.DisplayObject_visible).writeU8(record.visible);
        }
        originals.clear();
        hidden.clear();
        pending.clear();
        return;
      }
      if (!selected) return;
      for (const node of nodes) {
        if (node.kind === 'decorated') {
          remember(node.pointer);
          if (!node.pointer.add(o.DecoratedTextField_gradient).readPointer().equals(selected))
            decorate(node.pointer, selected, node.text);
        } else if (
          node.kind === 'plain' &&
          (requested.has(node.pointer.toString()) || node.text?.startsWith('\u2068'))
        ) {
          const parent = node.pointer.add(o.DisplayObject_parent).readPointer();
          if (!valid(parent)) continue;
          const predicate = parent.readPointer().add(o.DisplayObject_isMovieClipSlot).readPointer();
          if (!valid(predicate) || !new NativeFunction(predicate, 'int', ['pointer'])(parent))
            continue;
          const decorated = decorate(node.pointer, selected, node.text);
          if (!valid(decorated)) continue;
          remember(decorated, ptr(0));
          for (const duplicate of nodes) {
            if (
              duplicate.kind !== 'decorated' ||
              duplicate.pointer.equals(decorated) ||
              duplicate.text !== node.text
            )
              continue;
            if (!duplicate.pointer.add(o.DisplayObject_parent).readPointer().equals(parent))
              continue;
            if (!hidden.has(duplicate.pointer.toString()))
              hidden.set(duplicate.pointer.toString(), {
                text: duplicate.text,
                visible: duplicate.pointer.add(o.DisplayObject_visible).readU8(),
              });
            duplicate.pointer.add(o.DisplayObject_visible).writeU8(0);
          }
        }
      }
      pending.clear();
    }
    context.hook(resources, 'Name_applyDecoration', {
      onEnter(args) {
        if (applying) return;
        this.field = args[0];
        this.original = args[2];
        remember(args[0], args[2]);
        resolve();
        if (selected) args[2] = selected;
      },
      onLeave() {
        if (this.field) remember(this.field, this.original);
      },
    });
    context.hook(resources, 'TextField_setText', {
      onEnter(args) {
        if (!applying && readString(args[1])?.startsWith('\u2068')) pending.add(args[0].toString());
      },
    });
    context.frame(
      resources,
      (now) => {
        if (pending.size) apply();
        else if (!selected && config.name && now - lastWalk >= 250) {
          lastWalk = now;
          resolve();
          if (selected) apply();
        }
      },
      'gradient',
    );
    resources.own(() => apply(true));
    apply();
    return {
      configure(next) {
        config = next;
        selectedName = null;
        selected = null;
        apply();
      },
    };
  },
};
