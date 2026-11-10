import { offsets as o } from '../native/layout.js';
import { clampPoint } from '../math/walls.js';
import { valid } from '../native/bindings.js';

export function sendMove(context, logic, point) {
  if (
    !valid(logic) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    Math.abs(point.x) > 1e5 ||
    Math.abs(point.y) > 1e5
  )
    return false;
  const target = clampPoint(context.world.grid, point);
  context.native.LogicBattleModeClient_setClientPredictionMoveTo(logic, target.x, target.y, 1);
  return context.input(logic, 2, (input) => {
    input.add(o.ClientInput_x).writeS32(target.x);
    input.add(o.ClientInput_y).writeS32(target.y);
  });
}
