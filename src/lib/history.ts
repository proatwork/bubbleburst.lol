import { z } from 'zod';
import { PRESSURE_MAX, PRESSURE_MIN } from './bands.ts';

/**
 * The history view is built from the archived copies in content/history/ plus the live status.
 * Older archives may predate fields added later, so only the few fields the chart needs are read,
 * and a file that lacks even those is skipped rather than failing the build.
 */
const PointSchema = z.looseObject({
  updatedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'unparseable updatedAt'),
  pressure: z.number().int().min(PRESSURE_MIN).max(PRESSURE_MAX),
  composite: z.looseObject({ indicatorScore: z.number().min(PRESSURE_MIN).max(PRESSURE_MAX) }).optional(),
  indicators: z.array(z.looseObject({ id: z.string(), score: z.number().min(PRESSURE_MIN).max(PRESSURE_MAX) })).optional(),
});

export interface SeriesPoint {
  /** ISO timestamp as written in the file. */
  at: string;
  /** Epoch milliseconds, for plotting. */
  time: number;
  pressure: number;
  indicatorScore?: number;
  indicators?: Record<string, number>;
}

export interface Rejected {
  name: string;
  reason: string;
}

export interface Series {
  points: SeriesPoint[];
  rejected: Rejected[];
}

/**
 * Turns raw JSON records (name → parsed file) into a sorted, de-duplicated series.
 * Two records with the same updatedAt are one reading (the archive holds the previous live file).
 */
export function buildSeries(records: Record<string, unknown>): Series {
  const byTime = new Map<number, SeriesPoint>();
  const rejected: Rejected[] = [];

  for (const [name, raw] of Object.entries(records)) {
    const parsed = PointSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ name, reason: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') });
      continue;
    }
    const data = parsed.data;
    const time = Date.parse(data.updatedAt);
    const point: SeriesPoint = { at: data.updatedAt, time, pressure: data.pressure };
    if (data.composite) point.indicatorScore = data.composite.indicatorScore;
    if (data.indicators?.length) {
      point.indicators = Object.fromEntries(data.indicators.map((i) => [i.id, i.score]));
    }
    byTime.set(time, point);
  }

  const points = Array.from(byTime.values()).sort((a, b) => a.time - b.time);
  return { points, rejected };
}

export interface IndicatorPoint {
  time: number;
  score: number;
}

/** Per-indicator score history, oldest first, for the sparklines in the basket. */
export function indicatorHistory(points: readonly SeriesPoint[]): Map<string, IndicatorPoint[]> {
  const map = new Map<string, IndicatorPoint[]>();
  for (const point of points) {
    if (!point.indicators) continue;
    for (const [id, score] of Object.entries(point.indicators)) {
      const list = map.get(id) ?? [];
      list.push({ time: point.time, score });
      map.set(id, list);
    }
  }
  return map;
}

/** The calendar days (UTC) the series spans, as "YYYY-MM-DD", oldest first. */
export function daysOf(points: readonly SeriesPoint[]): string[] {
  const days = new Set<string>();
  for (const point of points) days.add(new Date(point.time).toISOString().slice(0, 10));
  return Array.from(days).sort();
}

/** URL slug for a reading: its timestamp with the colons removed, e.g. 2026-10-13T074603Z. */
export function slugFor(updatedAt: string): string {
  return updatedAt.replace(/\.\d+(?=Z$|[+-]\d{2}:\d{2}$)/, '').replace(/:/g, '');
}
