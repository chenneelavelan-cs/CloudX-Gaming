export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q || !t) return 0;
  if (t === q) return 200;
  if (t.startsWith(q)) return 150;
  if (t.includes(q)) return 120;

  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 12;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

export function rankByFuzzy<T>(items: T[], query: string, fields: ((item: T) => string)[]): T[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map((item) => {
      const score = Math.max(...fields.map((f) => fuzzyScore(q, f(item))));
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
