import { describe, it, expect } from 'vitest';
import { calculatePrice, PricingTierInput } from './index';

const pcTiers: PricingTierInput[] = [
  { durationMinutes: 60, price: 90, label: '1 Hour' },
  { durationMinutes: 180, price: 240, label: '3 Hours' },
  { durationMinutes: 300, price: 390, label: '5 Hours' },
];

const ps5PerHeadTiers: PricingTierInput[] = [
  { durationMinutes: 60, price: 120, playerCount: 1, label: '1 player' },
  { durationMinutes: 60, price: 90, playerCount: 2, label: '2 players' },
  { durationMinutes: 60, price: 80, playerCount: 3, label: '3 players' },
  { durationMinutes: 60, price: 70, playerCount: 4, label: '4 players' },
];

describe('calculatePrice — flat tiers (PC/VR)', () => {
  it('returns exact match for 1 hour', () => {
    const result = calculatePrice({
      durationMinutes: 60,
      playerCount: 1,
      tiers: pcTiers,
    });
    expect(result.price).toBe(90);
    expect(result.strategy).toBe('exact_match');
  });

  it('returns exact match for 3 hours', () => {
    const result = calculatePrice({
      durationMinutes: 180,
      playerCount: 1,
      tiers: pcTiers,
    });
    expect(result.price).toBe(240);
    expect(result.strategy).toBe('exact_match');
  });

  it('uses smallest covering tier for 90 minutes', () => {
    const result = calculatePrice({
      durationMinutes: 90,
      playerCount: 1,
      tiers: pcTiers,
    });
    expect(result.price).toBe(240);
    expect(result.strategy).toBe('smallest_covering');
  });

  it('handles VR 15-minute tiers', () => {
    const vrTiers: PricingTierInput[] = [
      { durationMinutes: 15, price: 60, label: '15 min' },
      { durationMinutes: 30, price: 100, label: '30 min' },
    ];
    const result = calculatePrice({ durationMinutes: 15, playerCount: 1, tiers: vrTiers });
    expect(result.price).toBe(60);
    expect(result.strategy).toBe('exact_match');
  });

  it('returns no_match when no tiers exist', () => {
    const result = calculatePrice({ durationMinutes: 60, playerCount: 1, tiers: [] });
    expect(result.price).toBe(0);
    expect(result.strategy).toBe('no_match');
  });
});

describe('calculatePrice — per head / hour (PS5/PS2)', () => {
  it('1 player × 1 hour at ₹120/head/hr = ₹120', () => {
    const result = calculatePrice({
      durationMinutes: 60,
      playerCount: 1,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(120);
    expect(result.strategy).toBe('per_head_hourly');
  });

  it('4 players × 1 hour at ₹70/head/hr (offer) = ₹280', () => {
    const result = calculatePrice({
      durationMinutes: 60,
      playerCount: 4,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(280);
    expect(result.strategy).toBe('per_head_hourly');
  });

  it('2 players × 1 hour at ₹90/head/hr = ₹180', () => {
    const result = calculatePrice({
      durationMinutes: 60,
      playerCount: 2,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(180);
  });

  it('4 players × 2 hours at ₹70/head/hr = ₹560', () => {
    const result = calculatePrice({
      durationMinutes: 120,
      playerCount: 4,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(560);
  });

  it('4 players × 5 hours at ₹70/head/hr = ₹1400', () => {
    const result = calculatePrice({
      durationMinutes: 300,
      playerCount: 4,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(1400);
  });

  it('recalculates on extension — 4P × 60min then 180min total', () => {
    const initial = calculatePrice({
      durationMinutes: 60,
      playerCount: 4,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(initial.price).toBe(280);

    const extended = calculatePrice({
      durationMinutes: 180,
      playerCount: 4,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(extended.price).toBe(840);
  });

  it('returns no_match when player bracket is missing', () => {
    const result = calculatePrice({
      durationMinutes: 60,
      playerCount: 5,
      tiers: ps5PerHeadTiers,
      supportsPlayerPricing: true,
    });
    expect(result.price).toBe(0);
    expect(result.strategy).toBe('no_match');
  });
});
