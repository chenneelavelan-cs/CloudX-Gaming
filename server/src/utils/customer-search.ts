/** Build a MongoDB filter for fuzzy-ish customer search (substring + subsequence). */
export function buildCustomerSearchFilter(q: string): Record<string, unknown> {
  const trimmed = q.trim();
  if (!trimmed) return {};

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subsequence = escaped.split('').join('.*');

  return {
    $or: [
      { name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { name: { $regex: subsequence, $options: 'i' } },
      { phone: { $regex: subsequence, $options: 'i' } },
    ],
  };
}
