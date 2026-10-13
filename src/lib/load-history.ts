import { StatusSchema, type Status } from './schema.ts';

/** Every archived reading in content/history, resolved at build time. */
const files = import.meta.glob<unknown>('../../content/history/*.json', { eager: true, import: 'default' });

/**
 * Full readings for the archive pages: the archive plus the live status, oldest first, one per timestamp.
 * A file that no longer matches the schema is skipped with a warning, matching the history chart's policy.
 */
export function loadReadings(current: Status): Status[] {
  const byTime = new Map<number, Status>();
  for (const [path, raw] of Object.entries(files)) {
    const result = StatusSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`archive: skipped ${path} (${result.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`).join('; ')})`);
      continue;
    }
    byTime.set(Date.parse(result.data.updatedAt), result.data);
  }
  byTime.set(Date.parse(current.updatedAt), current);
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, reading]) => reading);
}
