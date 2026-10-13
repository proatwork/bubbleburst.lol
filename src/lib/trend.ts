export type Trend = 'up' | 'down' | 'flat';

/** One small arrow per trend; the word is read out to screen readers. */
export const TREND_ARROWS: Record<Trend, { d: string; word: string }> = {
  up: { d: 'M6 12V2M2 6l4-4 4 4', word: 'rising' },
  down: { d: 'M6 2v10M2 8l4 4 4-4', word: 'falling' },
  flat: { d: 'M1 7h10M8 4l3 3-3 3', word: 'flat' },
};
