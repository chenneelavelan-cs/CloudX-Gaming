import { GamingResource } from '../models';

export function filterResourcesForOption(
  resources: GamingResource[],
  optionId: string,
  tvOnly = false
): GamingResource[] {
  return resources.filter((r) => {
    const supportsOption = r.supportedOptionIds.some(
      (id) => (typeof id === 'string' ? id : id._id) === optionId
    );
    if (!supportsOption) return false;

    const code = r.code.toUpperCase();
    if (code.startsWith('PS5-') || code.startsWith('PS2-')) return false;
    if (tvOnly && !code.startsWith('TV-')) return false;

    return true;
  });
}

export function resourceSelectLabel(resource: GamingResource): string {
  const code = resource.code.toUpperCase();
  if (code.startsWith('TV-')) {
    const num = parseInt(code.split('-')[1], 10);
    return Number.isNaN(num) ? resource.name : `TV ${num}`;
  }
  return resource.name;
}
