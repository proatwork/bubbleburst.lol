import { z } from 'zod';
import { LIMITS } from './limits.ts';
import { PRESSURE_MAX, PRESSURE_MIN } from './bands.ts';
import { extractCitations } from './cite.ts';

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
