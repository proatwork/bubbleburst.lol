import { readFileSync } from 'node:fs';
import type { Status } from './schema.ts';

const CONTENT_URL = new URL('../../content/status.json', import.meta.url);

/**
 * A deep copy of the shipped content/status.json, safe to mutate in a test.
 * Only the "shipped content is valid" test should read this: the routine rewrites the file
 * every run, so nothing else in the suite may depend on what it currently holds.
 */
export function loadShippedStatus(): Status {
  return JSON.parse(readFileSync(CONTENT_URL, 'utf8')) as Status;
}

/**
 * A small, static, valid status: three signals (two with an eli5 text), two paragraphs, three sources, no basket.
 * Every source lives under example.com so a fixture URL can never collide with a real citation.
 * Source [1] is cited by paragraph 1 and signal 1, [2] by paragraph 2 and signal 2, [3] by signal 3.
 */
const BASELINE: Status = {
  updatedAt: '2026-10-12T06:00:00Z',
  pressure: 71,
  previousPressure: 69,
  headline: 'AI capex keeps climbing while the market waits for earnings',
  summary: 'Spending guidance rose again and the index is flat into the big bank prints. [1]',
  signals: [
    { label: 'Hyperscaler capex guidance', value: '$420bn', note: 'raised for the third quarter in a row', trend: 'up', eli5: 'What the biggest cloud companies plan to spend on data centres and chips. When it keeps rising, the boom is still being built.', sources: [1] },
    { label: 'S&P 500 futures', value: '-0.1%', note: 'muted ahead of earnings season', trend: 'flat', eli5: 'Bets on where the main US stock index will open. A flat reading means the market is waiting rather than moving.', sources: [2] },
    { label: 'Fund-manager AI bubble worry', value: '54%', note: 'the most-cited tail risk in the monthly survey', trend: 'up', sources: [3] },
  ],
  analysis: [
    'Capital spending guidance went up again this week, and the market shrugged [1].',
    'Futures are flat into the first bank earnings, so the next move waits on results [2].',
  ],
  sources: [
    { title: 'Capex guidance roundup', publisher: 'Example Wire', url: 'https://example.com/news/capex-guidance', date: '2026-10-11' },
    { title: 'Futures muted ahead of bank earnings', publisher: 'Example Markets', url: 'https://example.com/news/futures-muted', date: '2026-10-12' },
    { title: 'Monthly fund-manager survey', publisher: 'Example Research', url: 'https://example.com/research/fund-manager-survey', date: '2026-10-10' },
  ],
  generatedBy: 'test-fixture',
};

/** How many sources the baseline carries; the basket fixture appends its own after these. */
export const BASELINE_SOURCE_COUNT = BASELINE.sources.length;

/** A deep copy of the static baseline, safe to mutate in a test. */
export function loadFixture(): Status {
  return structuredClone(BASELINE);
}

/**
 * The baseline plus a small, arithmetically consistent basket: three indicators,
 * a composite that matches them, one fundamentals tile, and the extra sources they cite.
 * Indicator sources sit at [BASELINE_SOURCE_COUNT + 1 .. + 3], the fundamentals source at [+ 4].
 * Weighted mean: (91.4·1.5 + 72.0·0.5 + 87.0·0.5) / 2.5 = 86.6; fragility 91.4; trigger 72.0; confirmation 87.0.
 */
export function loadBasketFixture(): Status {
  const status = loadFixture();
  const base = BASELINE_SOURCE_COUNT;
  status.sources.push(
    { title: 'Shiller PE Ratio', publisher: 'Example Data', url: 'https://example.com/data/shiller-pe', date: '2026-10-09' },
    { title: 'US High Yield Option-Adjusted Spread', publisher: 'Example Data', url: 'https://example.com/data/high-yield-spread', date: '2026-10-12' },
    { title: 'Unemployment Rate', publisher: 'Example Data', url: 'https://example.com/data/unemployment-rate', date: '2026-10-02' },
    { title: 'S&P 500 Earnings Season Update', publisher: 'Example Research', url: 'https://example.com/research/forward-pe', date: '2026-10-09' },
  );
  status.indicators = [
    {
      id: 'shillerCape',
      label: 'Shiller CAPE',
      group: 'fragility',
      value: 41.87,
      unit: 'ratio',
      asOf: '2026-10-09',
      score: 91.4,
      previousScore: 90.9,
      weight: 1.5,
      direction: 'higher',
      trend: 'up',
      detail: 'S&P 500 cyclically adjusted P/E',
      eli5: 'Share prices divided by ten years of average profits, so one odd year cannot fool it. Higher means people pay more for each dollar of profit.',
      sources: [base + 1],
    },
    {
      id: 'highYieldSpread',
      label: 'High-yield spread',
      group: 'trigger',
      value: 311,
      unit: 'bp',
      asOf: '2026-10-12',
      score: 72,
      weight: 0.5,
      direction: 'lower',
      trend: 'flat',
      detail: 'US HY option-adjusted spread',
      sources: [base + 2],
    },
    {
      id: 'unemploymentRate',
      label: 'Unemployment rate',
      group: 'confirmation',
      value: 4.2,
      unit: '%',
      asOf: '2026-09-30',
      score: 87,
      weight: 0.5,
      direction: 'lower',
      trend: 'flat',
      stale: false,
      verified: true,
      detail: 'U-3 unemployment',
      sources: [base + 3],
    },
  ];
  status.composite = {
    method: 'weighted-mean',
    indicatorScore: 86.6,
    fragilityScore: 91.4,
    triggerScore: 72,
    confirmationScore: 87,
    newsAdjustment: 0,
    indicatorCount: 3,
    missingCount: 0,
  };
  status.fundamentals = [
    { label: 'S&P 500 forward P/E', value: '19.1', note: 'at its 10-year average; the strongest "not a bubble" reading', trend: 'flat', eli5: 'Share prices divided by the profits analysts expect next year. At its long-run average, prices are not ahead of expected earnings.', sources: [base + 4] },
  ];
  return status;
}
