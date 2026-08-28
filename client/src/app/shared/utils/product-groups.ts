const GROUP_LABELS: Record<string, string> = {
  food: 'Food',
  drink: 'Drinks',
  other: 'Other',
};

const GROUP_ORDER = ['food', 'drink', 'other'];

export function normalizeGroup(value: string | undefined | null): string {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized || 'other';
}

export function groupLabel(category: string): string {
  return GROUP_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export function groupIcon(category: string): string {
  const icons: Record<string, string> = {
    drink: 'local_cafe',
    food: 'restaurant',
    other: 'add_circle',
  };
  return icons[category] ?? 'category';
}

export function sortGroups(groups: string[]): string[] {
  return [...new Set(groups)].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function collectGroups(products: { category: string }[]): string[] {
  return sortGroups(products.map((p) => p.category));
}
