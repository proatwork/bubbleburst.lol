import { BANDS, type Band, PRESSURE_MAX } from './bands.ts';

/**
 * Which sub-score an indicator feeds.
 * fragility: how stretched prices, positioning and AI capex are (valuation-type readings; slow, non-timing).
 * trigger: the things that have historically pricked bubbles (rates, credit).
 * confirmation: lagging series that only confirm a burst already under way; low weight by design.
 */
export const INDICATOR_GROUPS = ['fragility', 'trigger', 'confirmation'] as const;
export type IndicatorGroup = (typeof INDICATOR_GROUPS)[number];

export const GROUP_LABEL: Record<IndicatorGroup, string> = {
  fragility: 'Fragility',
  trigger: 'Trigger',
  confirmation: 'Confirmation',
};

export const GROUP_MEANING: Record<IndicatorGroup, string> = {
  fragility: 'How far prices, positioning and AI spending have run. Says how far there is to fall, not when.',
  trigger: 'Rates and credit: what has historically pricked bubbles.',
  confirmation: 'Lagging series that only confirm a burst under way. Kept at low weight.',
};

export interface Scored {
  score: number;
  weight: number;
  group?: IndicatorGroup;
}

/** Weighted mean of indicator scores, rounded to one decimal. Null when the list is empty. */
export function weightedMean(items: readonly Scored[]): number | null {
  let total = 0;
  let weights = 0;
  for (const item of items) {
    total += item.score * item.weight;
    weights += item.weight;
  }
  if (weights === 0) return null;
  return Math.round((total / weights) * 10) / 10;
}

/** Weighted mean of the items in one group. Null when the group is empty. */
export function groupMean(items: readonly Scored[], group: IndicatorGroup): number | null {
  return weightedMean(items.filter((item) => item.group === group));
}

/** The band a 0–100 score falls in, so each indicator can borrow the meter's colours. */
export function bandForScore(score: number): Band {
  const clamped = Math.min(PRESSURE_MAX, Math.max(0, score));
  const whole = Math.floor(clamped);
  const band = BANDS.find((b) => whole >= b.min && whole <= b.max);
  if (!band) throw new RangeError(`no band covers score ${score}`);
  // 100 is "at or beyond the pre-burst reference", not "burst": show it as critical.
  return band.id === 'burst' ? (BANDS.find((b) => b.id === 'critical') as Band) : band;
}

/** A score of 100 means the reading sits at or beyond the level reached before a past burst. */
export function isSaturated(score: number): boolean {
  return score >= PRESSURE_MAX;
}

/** Scores are shown whole on the page and kept to one decimal in the data; only a true 100 reads as 100. */
export function formatScore(score: number): string {
  if (isSaturated(score)) return '100';
  return String(Math.min(99, Math.round(score)));
}

/** Compact number for a reading: 41.87 → "41.87", 1453832 → "1,453,832", -11.54 → "−11.54". */
export function formatReading(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  const text = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(abs);
  return value < 0 ? `−${text}` : text;
}
