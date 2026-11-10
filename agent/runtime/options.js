import { canonicalName } from '../data/brawlers.js';

export const boolean = (fallback) => ({
  default: fallback,
  valid: (value) => typeof value === 'boolean',
});
// Older hosts send partial option objects and expect invalid fields to be ignored
export function compatibleOptions(schema) {
  return (patch, previous = {}) => {
    const input = patch && typeof patch === 'object' ? patch : {};
    const result = {};
    for (const [key, rule] of Object.entries(schema)) {
      result[key] = previous[key] ?? rule.default;
      if (Object.hasOwn(input, key) && rule.valid(input[key]))
        result[key] = rule.convert ? rule.convert(input[key]) : input[key];
      if (Array.isArray(result[key])) result[key] = Object.freeze([...result[key]]);
    }
    return Object.freeze(result);
  };
}

export const bounded = (fallback, min, max, integer = false) => ({
  default: fallback,
  valid: (value) => typeof value === 'number' && Number.isFinite(value),
  convert: (value) => Math.max(min, Math.min(max, integer ? value | 0 : value)),
});
export const names = () => ({
  default: [],
  valid: Array.isArray,
  convert: (value) => value.map(canonicalName).filter(Boolean),
});
