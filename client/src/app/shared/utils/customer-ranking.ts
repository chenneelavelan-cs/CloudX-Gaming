import { Customer } from '../models';
import { fuzzyScore } from './fuzzy-search';

export function rankCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim();
  if (!q) {
    return [...customers].sort((a, b) => {
      if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
      const aLast = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
      const bLast = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
      return bLast - aLast || a.name.localeCompare(b.name);
    });
  }

  return customers
    .map((c) => ({
      customer: c,
      score: Math.max(fuzzyScore(q, c.name), fuzzyScore(q, c.phone)),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.customer.totalVisits !== a.customer.totalVisits) return b.customer.totalVisits - a.customer.totalVisits;
      return a.customer.name.localeCompare(b.customer.name);
    })
    .map((x) => x.customer);
}
