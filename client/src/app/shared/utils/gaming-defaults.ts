import { GamingOption } from '../models';

export function findPs5Option(options: GamingOption[]): GamingOption | undefined {
  return options.find((o) => o.slug === 'ps5' || o.name.toLowerCase() === 'ps5');
}

export function applyDefaultGamingOption(options: GamingOption[]): string {
  return findPs5Option(options)?._id || options[0]?._id || '';
}
