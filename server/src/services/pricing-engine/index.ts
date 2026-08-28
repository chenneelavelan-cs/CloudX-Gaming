export interface PricingTierInput {
  durationMinutes: number;
  price: number;
  playerCount?: number;
  label?: string;
}

export interface PricingInput {
  durationMinutes: number;
  playerCount: number;
  tiers: PricingTierInput[];
  /** PS5/PS2: tier.price is per-head per hour → total = price × players × hours */
  supportsPlayerPricing?: boolean;
}

export type PricingStrategy =
  | 'exact_match'
  | 'smallest_covering'
  | 'largest_exceeded'
  | 'no_match'
  | 'per_head_hourly';

export interface PricingResult {
  price: number;
  matchedTier: PricingTierInput | null;
  strategy: PricingStrategy;
  breakdown: string;
}

export function calculatePrice(input: PricingInput): PricingResult {
  if (input.supportsPlayerPricing) {
    return calculatePerHeadHourlyPrice(input);
  }
  return calculateFlatTierPrice(input);
}

/** Flat bundle pricing (PC, VR, driving wheel) — price is total for the tier duration */
function calculateFlatTierPrice(input: PricingInput): PricingResult {
  const { durationMinutes, playerCount, tiers } = input;

  if (!tiers.length) {
    return {
      price: 0,
      matchedTier: null,
      strategy: 'no_match',
      breakdown: 'No pricing tiers configured',
    };
  }

  const applicableTiers = tiers
    .filter((t) => t.playerCount === undefined || t.playerCount === playerCount)
    .sort((a, b) => a.durationMinutes - b.durationMinutes);

  if (!applicableTiers.length) {
    return {
      price: 0,
      matchedTier: null,
      strategy: 'no_match',
      breakdown: `No pricing tiers for ${playerCount} player(s)`,
    };
  }

  const exactMatch = applicableTiers.find((t) => t.durationMinutes === durationMinutes);
  if (exactMatch) {
    return {
      price: exactMatch.price,
      matchedTier: exactMatch,
      strategy: 'exact_match',
      breakdown: formatBreakdown(exactMatch, durationMinutes),
    };
  }

  const coveringTier = applicableTiers.find((t) => t.durationMinutes >= durationMinutes);
  if (coveringTier) {
    return {
      price: coveringTier.price,
      matchedTier: coveringTier,
      strategy: 'smallest_covering',
      breakdown: `${formatDuration(durationMinutes)} → ${coveringTier.label || formatDuration(coveringTier.durationMinutes)} tier (${formatCurrency(coveringTier.price)})`,
    };
  }

  const largestTier = applicableTiers[applicableTiers.length - 1];
  return {
    price: largestTier.price,
    matchedTier: largestTier,
    strategy: 'largest_exceeded',
    breakdown: `${formatDuration(durationMinutes)} exceeds max tier — using ${largestTier.label || formatDuration(largestTier.durationMinutes)} (${formatCurrency(largestTier.price)}). Review manually.`,
  };
}

/** Per-head hourly pricing (PS5, PS2) — tier.price is ₹/head/hr for that player bracket */
function calculatePerHeadHourlyPrice(input: PricingInput): PricingResult {
  const { durationMinutes, playerCount, tiers } = input;

  const playerTiers = tiers
    .filter((t) => t.playerCount === playerCount)
    .sort((a, b) => a.durationMinutes - b.durationMinutes);

  if (!playerTiers.length) {
    return {
      price: 0,
      matchedTier: null,
      strategy: 'no_match',
      breakdown: `No per-head rate for ${playerCount} player(s)`,
    };
  }

  // Rate is defined per hour (60 min base); scale linearly for session length
  const rateTier = playerTiers.find((t) => t.durationMinutes === 60) ?? playerTiers[0];
  const hours = durationMinutes / rateTier.durationMinutes;
  const total = Math.round(rateTier.price * playerCount * hours);

  return {
    price: total,
    matchedTier: rateTier,
    strategy: 'per_head_hourly',
    breakdown: `${formatCurrency(rateTier.price)}/head/hr × ${playerCount} player${playerCount > 1 ? 's' : ''} × ${formatHours(hours)} = ${formatCurrency(total)}`,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === Math.floor(hours) ? `${hours} hour${hours > 1 ? 's' : ''}` : `${minutes} min`;
}

function formatHours(hours: number): string {
  if (hours === 1) return '1 hr';
  if (Number.isInteger(hours)) return `${hours} hrs`;
  const mins = Math.round(hours * 60);
  return formatDuration(mins);
}

function formatCurrency(amount: number): string {
  return `₹${amount}`;
}

function formatBreakdown(tier: PricingTierInput, requestedMinutes: number): string {
  const tierLabel = tier.label || formatDuration(tier.durationMinutes);
  return `${formatDuration(requestedMinutes)} → ${tierLabel} (${formatCurrency(tier.price)})`;
}
