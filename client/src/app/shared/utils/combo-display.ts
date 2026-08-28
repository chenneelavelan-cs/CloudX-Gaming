import { Combo } from '../models';

export function isComboMustTry(combo: Pick<Combo, 'mustTry' | 'description'>): boolean {
  if (combo.mustTry) return true;
  return combo.description?.toLowerCase().includes('must try') ?? false;
}
