import { readFileSync } from 'node:fs';
import type { Status } from './schema.ts';

const CONTENT_URL = new URL('../../content/status.json', import.meta.url);

/** A deep copy of the shipped content, safe to mutate in a test. */
export function loadFixture(): Status {
  return JSON.parse(readFileSync(CONTENT_URL, 'utf8')) as Status;
}

/**
 * The shipped content plus a small, arithmetically consistent basket: three indicators,
 * a composite that matches them, one fundamentals tile, and the extra sources they cite.
 * Weighted mean: (91.4·1.5 + 72.0·0.5 + 87.0·0.5) / 2.5 = 86.6; fragility 91.4; trigger 72.0; confirmation 87.0.
 */
export function loadBasketFixture(): Status {
  const status = loadFixture();
  const base = status.sources.length;
  status.sources.push(
    { title: 'Shiller PE Ratio', publisher: 'multpl.com', url: 'https://www.multpl.com/shiller-pe', date: '2026-10-09' },
    { title: 'ICE BofA US High Yield Index Option-Adjusted Spread (BAMLH0A0HYM2)', publisher: 'FRED, Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org/data/BAMLH0A0HYM2', date: '2026-10-12' },
    { title: 'Unemployment Rate (UNRATE)', publisher: 'FRED, Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org/series/UNRATE', date: '2026-10-02' },
    { title: 'S&P 500 Earnings Season Update', publisher: 'FactSet', url: 'https://insight.factset.com/example-forward-pe', date: '2026-10-09' },
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
      detail: 'S&P 500 cyclically adjusted P/E, multpl.com',
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
      detail: 'ICE BofA US HY option-adjusted spread, FRED',
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
      detail: 'U-3 unemployment, BLS via FRED',
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
    { label: 'S&P 500 forward P/E', value: '19.1', note: 'at its 10-year average; the strongest "not a bubble" reading', trend: 'flat', sources: [base + 4] },
  ];
  return status;
}
