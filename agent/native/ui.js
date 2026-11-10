import { offsets as o } from './layout.js';
import { valid, readString, withString } from './bindings.js';

export function createSpectators(context) {
  const states = new Map();
  let lastKey = null;
  return {
    set(name, value) {
      if (value) states.set(name, value);
      else states.delete(name);
      if (!states.size) lastKey = null;
    },
    update(screen) {
      const config = states.get('brawltv') ?? states.get('spec');
      if (!config || !valid(screen)) return;
      const widget = screen.add(o.BattleScreen_spectateWidget).readPointer();
      const field = screen.add(o.BattleScreen_spectateTextField).readPointer();
      if (!valid(widget) || !valid(field)) return;
      widget.add(o.DisplayObject_visible).writeU8(1);
      const key = `${context.battleVersion}:${field}:${config.count}`;
      if (key !== lastKey) {
        withString(context.native, String(config.count), (value) =>
          context.native.TextField_setText(field, value),
        );
        lastKey = key;
      }
      context.native.MovieClip__gotoAndStopFrameIndex(widget, states.has('brawltv') ? 1 : 0);
    },
  };
}

export function fieldKind(base, field) {
  if (!valid(field)) return null;
  const table = field.readPointer();
  if (table.equals(base.add(o.VTABLE_TEXT_FIELD))) return 'plain';
  if (
    table.equals(base.add(o.VTABLE_DECORATED_TEXT_FIELD)) &&
    field.add(o.DecoratedTextField_marker).readU32() === 726355
  )
    return 'decorated';
  return null;
}
export function scene(context) {
  const stage = context.base.add(o.StageInstanceGlobalPtr).readPointer();
  if (!valid(stage)) return [];
  const root = stage.add(o.Stage_spriteContainer).readPointer();
  const queue = [{ pointer: root, depth: 0 }],
    seen = new Set(),
    result = [];
  for (let index = 0; index < queue.length && index < 8192; index++) {
    const { pointer, depth } = queue[index];
    if (!valid(pointer) || depth > 16 || seen.has(pointer.toString())) continue;
    seen.add(pointer.toString());
    try {
      const kind = fieldKind(context.base, pointer);
      result.push({
        pointer,
        kind,
        text: kind ? readString(pointer.add(o.DecoratedTextField_text)) : null,
      });
      if (kind) continue;
      const count = pointer.add(o.Sprite_childCount).readU16();
      if (!count || count > 512) continue;
      const children = pointer.add(o.Sprite_childArray).readPointer();
      if (!valid(children)) continue;
      for (let i = 0; i < count && queue.length < 8192; i++)
        queue.push({ pointer: children.add(i * 8).readPointer(), depth: depth + 1 });
    } catch (error) {
      context.log.error('UI scene', error);
    }
  }
  return result;
}

export function createFpsLabel(context) {
  let container = null,
    textField = null,
    stageAtBuild = null,
    last = null;
  const n = context.native,
    file = Memory.allocUtf8String('sc/ui.sc'),
    fieldName = Memory.allocUtf8String('txt');
  return {
    show(text, x, y) {
      const stage = context.base.add(o.StageInstanceGlobalPtr).readPointer();
      if (!valid(stage)) return false;
      if (!stageAtBuild?.equals(stage)) {
        container = textField = null;
        last = null;
        stageAtBuild = stage;
      }
      if (!container) {
        if (!valid(n.ResourceManager__isResourceLoaded(file, 0))) return false;
        const node = n.operator_new(208);
        if (!valid(node)) throw new Error('FPS container allocation failed');
        withString(n, 'sc/ui.sc', (name) =>
          withString(n, 'damage_number', (exportName) =>
            n.DropGUIContainer__ctorFromExport(node, name, exportName),
          ),
        );
        const clip = node.add(o.DropGUIContainer_movieClip).readPointer();
        if (!valid(clip)) throw new Error('FPS movie clip missing');
        const field = n.MovieClip__getTextFieldByName(clip, fieldName);
        if (!valid(field)) throw new Error('FPS text field missing');
        clip.add(o.DisplayObject_visible).writeU8(1);
        node.add(o.DisplayObject_scaleX).writeFloat(1.4);
        node.add(o.DisplayObject_scaleY).writeFloat(1.4);
        n.Stage_addChild(stage, node);
        container = node;
        textField = field;
      }
      container.add(o.DisplayObject_x).writeFloat(x);
      container.add(o.DisplayObject_y).writeFloat(y);
      container.add(o.DisplayObject_visible).writeU8(1);
      if (last !== text) {
        withString(n, text, (value) => n.TextField_setText(textField, value));
        last = text;
      }
      return true;
    },
    hide() {
      const stage = context.base.add(o.StageInstanceGlobalPtr).readPointer();
      if (container && stageAtBuild?.equals(stage))
        container.add(o.DisplayObject_visible).writeU8(0);
      last = null;
    },
    dispose() {
      const stage = context.base.add(o.StageInstanceGlobalPtr).readPointer();
      if (container && stageAtBuild?.equals(stage)) n.DisplayObject__removeFromParent(container);
      container = textField = stageAtBuild = null;
    },
  };
}
