import { z } from 'zod';
import { LIMITS } from './limits.ts';
import { PRESSURE_MAX, PRESSURE_MIN } from './bands.ts';
import { extractCitations } from './cite.ts';
import { INDICATOR_GROUPS, groupMean, weightedMean } from './indicators.ts';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function isRealCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const isoDate = z
  .string()
  .regex(ISO_DATE, 'Expected a date formatted YYYY-MM-DD')
  .refine(isRealCalendarDate, 'Not a real calendar date');

const isoDateTime = z
  .string()
  .regex(ISO_DATETIME, 'Expected an ISO 8601 timestamp with a timezone, e.g. 2026-10-13T06:00:00Z')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a parseable timestamp');

const httpsUrl = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Expected an absolute https:// URL');

const text = (max: number) => z.string().trim().min(1, 'Must not be empty').max(max, `Must be at most ${max} characters`);

const citationList = z
  .array(z.number().int().positive())
  .min(1, 'List at least one source index')
  .refine((list) => new Set(list).size === list.length, 'Duplicate source index');

export const SignalSchema = z
  .strictObject({
    label: text(LIMITS.signalLabelMax),
    value: text(LIMITS.signalValueMax),
    note: text(LIMITS.signalNoteMax),
    trend: z.enum(['up', 'down', 'flat']).optional(),
    sources: citationList,
  });

export const SourceSchema = z
  .strictObject({
    title: text(LIMITS.sourceTitleMax),
    publisher: text(LIMITS.publisherMax),
    url: httpsUrl,
    date: isoDate,
  });

const pressure = z.number().int().min(PRESSURE_MIN).max(PRESSURE_MAX);

/** A 0–100 indicator score, kept to one decimal. */
const score = z
  .number()
  .min(PRESSURE_MIN)
  .max(PRESSURE_MAX)
  .refine((v) => Math.round(v * 10) === v * 10, 'Round scores to one decimal');

const INDICATOR_ID = /^[a-z][a-zA-Z0-9]*$/;

/**
 * One scored series in the basket. The reference levels and fetch rules live in the routine,
 * not here: status.json only carries what was read, when it applies, and the score it produced.
 */
export const IndicatorSchema = z.strictObject({
  id: z.string().regex(INDICATOR_ID, 'Expected a camelCase id, e.g. shillerCape').max(LIMITS.indicatorIdMax),
  label: text(LIMITS.indicatorLabelMax),
  group: z.enum(INDICATOR_GROUPS),
  value: z.number(),
  unit: text(LIMITS.indicatorUnitMax),
  /** The date the figure refers to, not the day it was read. */
  asOf: isoDate,
  score,
  previousScore: score.optional(),
  weight: z.number().min(LIMITS.indicatorWeightMin).max(LIMITS.indicatorWeightMax),
  /** Which way is more bubble-like; "lower" means a falling reading raises the score. */
  direction: z.enum(['higher', 'lower']).optional(),
  trend: z.enum(['up', 'down', 'flat']).optional(),
  /** True when both fetches failed and the previous reading was carried forward. */
  stale: z.boolean().optional(),
  /** False for a feed that has never been fetched successfully in testing. */
  verified: z.boolean().optional(),
  /** ≤ 64 characters: what the figure measures and where it comes from. */
  detail: text(LIMITS.indicatorDetailMax),
  sources: citationList,
});

/** How the indicator basket was combined. Required whenever indicators are present. */
export const CompositeSchema = z.strictObject({
  method: z.literal('weighted-mean'),
  indicatorScore: score,
  fragilityScore: score.optional(),
  triggerScore: score.optional(),
  confirmationScore: score.optional(),
  newsAdjustment: z.number().int().min(-LIMITS.newsAdjustmentMax).max(LIMITS.newsAdjustmentMax),
  reason: text(LIMITS.compositeReasonMax).optional(),
  /** Indicators that were scored in this run. */
  indicatorCount: z.number().int().min(0),
  /** Indicators whose fetches both failed and that were left out of the mean. */
  missingCount: z.number().int().min(0),
});

const MAX_FUTURE_MS = 60 * 60 * 1000;

const updatedAt = isoDateTime.refine(
  (v) => Date.parse(v) <= Date.now() + MAX_FUTURE_MS,
  'updatedAt is in the future; use the current UTC time',
);

export const StatusSchema = z
  .strictObject({
    updatedAt,
    pressure,
    previousPressure: pressure.optional(),
    headline: text(LIMITS.headlineMax),
    summary: text(LIMITS.summaryMax),
    signals: z.array(SignalSchema).min(LIMITS.signalsMin).max(LIMITS.signalsMax),
    analysis: z.array(text(LIMITS.paragraphMax)).min(LIMITS.analysisMin).max(LIMITS.analysisMax),
    sources: z.array(SourceSchema).min(LIMITS.sourcesMin).max(LIMITS.sourcesMax),
    generatedBy: text(LIMITS.generatedByMax),
    /** The scored basket. Optional so older content still builds; the routine always writes it. */
    indicators: z.array(IndicatorSchema).min(LIMITS.indicatorsMin).max(LIMITS.indicatorsMax).optional(),
    composite: CompositeSchema.optional(),
    /** Unscored counter-evidence tiles, shaped like signals. */
    fundamentals: z.array(SignalSchema).min(LIMITS.fundamentalsMin).max(LIMITS.fundamentalsMax).optional(),
  })
  .superRefine((status, ctx) => {
    const sourceCount = status.sources.length;
    const cited = new Set<number>();

    const check = (indices: number[], path: (string | number)[]) => {
      for (const index of indices) {
        if (index < 1 || index > sourceCount) {
          ctx.addIssue({ code: 'custom', path, message: `Cites source [${index}] but there are only ${sourceCount} sources` });
        } else {
          cited.add(index);
        }
      }
    };

    check(extractCitations(status.summary), ['summary']);

    status.analysis.forEach((paragraph, i) => {
      const indices = extractCitations(paragraph);
      if (indices.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['analysis', i], message: 'Every analysis paragraph must cite at least one source, e.g. "… fell 3% [1]."' });
      }
      check(indices, ['analysis', i]);
    });

    status.signals.forEach((signal, i) => check(signal.sources, ['signals', i, 'sources']));
    status.fundamentals?.forEach((tile, i) => check(tile.sources, ['fundamentals', i, 'sources']));
    status.indicators?.forEach((indicator, i) => check(indicator.sources, ['indicators', i, 'sources']));

    if (status.indicators) {
      const ids = new Set<string>();
      status.indicators.forEach((indicator, i) => {
        if (ids.has(indicator.id)) {
          ctx.addIssue({ code: 'custom', path: ['indicators', i, 'id'], message: `Duplicate indicator id "${indicator.id}"` });
        }
        ids.add(indicator.id);
      });

      if (!status.composite) {
        ctx.addIssue({ code: 'custom', path: ['composite'], message: 'composite is required when indicators are present' });
      } else {
        // The arithmetic is checked, not trusted: the published means must match the listed scores.
        const tolerance = LIMITS.compositeTolerance;
        const mean = weightedMean(status.indicators);
        if (mean !== null && Math.abs(mean - status.composite.indicatorScore) > tolerance) {
          ctx.addIssue({
            code: 'custom',
            path: ['composite', 'indicatorScore'],
            message: `indicatorScore ${status.composite.indicatorScore} does not match the weighted mean of the listed scores (${mean})`,
          });
        }
        const subScores = [
          ['fragilityScore', 'fragility'],
          ['triggerScore', 'trigger'],
          ['confirmationScore', 'confirmation'],
        ] as const;
        for (const [field, group] of subScores) {
          const published = status.composite[field];
          if (published === undefined) continue;
          const actual = groupMean(status.indicators, group);
          if (actual === null) {
            ctx.addIssue({ code: 'custom', path: ['composite', field], message: `${field} is set but no indicator has group "${group}"` });
          } else if (Math.abs(actual - published) > tolerance) {
            ctx.addIssue({ code: 'custom', path: ['composite', field], message: `${field} ${published} does not match the ${group} indicators' weighted mean (${actual})` });
          }
        }
        if (status.composite.indicatorCount !== status.indicators.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['composite', 'indicatorCount'],
            message: `indicatorCount ${status.composite.indicatorCount} but ${status.indicators.length} indicators are listed`,
          });
        }
      }
    } else if (status.composite) {
      ctx.addIssue({ code: 'custom', path: ['composite'], message: 'composite needs an indicators list to describe' });
    }

    status.sources.forEach((_source, i) => {
      if (!cited.has(i + 1)) {
        ctx.addIssue({ code: 'custom', path: ['sources', i], message: `Source [${i + 1}] is never cited; cite it or remove it` });
      }
    });

    const urls = new Set<string>();
    status.sources.forEach((source, i) => {
      if (urls.has(source.url)) {
        ctx.addIssue({ code: 'custom', path: ['sources', i, 'url'], message: 'Duplicate source URL' });
      }
      urls.add(source.url);
    });
  });

export type Status = z.infer<typeof StatusSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Indicator = z.infer<typeof IndicatorSchema>;
export type Composite = z.infer<typeof CompositeSchema>;
