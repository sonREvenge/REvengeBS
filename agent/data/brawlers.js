import { aliases } from './calibration.js';

export function canonicalName(value) {
  if (!value) return null;
  const name = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  return aliases[name] ?? name;
}
