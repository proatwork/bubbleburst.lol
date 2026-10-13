#!/usr/bin/env node
/**
 * Validates content/status.json against the schema and prints a short summary.
 * Exit code 0 = valid, 1 = invalid or unreadable. Run with: npm run validate
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bandFor } from '../src/lib/bands.ts';
import { CONTENT_PATH, parseStatus, StatusValidationError } from '../src/lib/status.ts';

async function main(): Promise<number> {
  const file = resolve(process.cwd(), CONTENT_PATH);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Could not read ${CONTENT_PATH}: ${(error as Error).message}`);
    return 1;
  }
  try {
    const status = parseStatus(raw);
    const band = bandFor(status.pressure);
    console.log(`OK  ${CONTENT_PATH}`);
    console.log(`    updatedAt   ${status.updatedAt}`);
    console.log(`    pressure    ${status.pressure}/100 (${band.label})`);
    console.log(`    headline    ${status.headline}`);
    console.log(`    signals     ${status.signals.length}`);
    console.log(`    paragraphs  ${status.analysis.length}`);
    console.log(`    sources     ${status.sources.length}`);
    if (status.indicators && status.composite) {
      const stale = status.indicators.filter((i) => i.stale).length;
      const unverified = status.indicators.filter((i) => i.verified === false).length;
      const top = [...status.indicators].sort((a, b) => b.score - a.score).slice(0, 3).map((i) => `${i.id} ${i.score}`).join(', ');
      console.log(`    indicators  ${status.indicators.length} scored, ${status.composite.missingCount} missing, ${stale} stale, ${unverified} unverified`);
      console.log(`    composite   ${status.composite.indicatorScore} (fragility ${status.composite.fragilityScore ?? '—'}, trigger ${status.composite.triggerScore ?? '—'}, confirmation ${status.composite.confirmationScore ?? '—'}), news ${status.composite.newsAdjustment >= 0 ? '+' : ''}${status.composite.newsAdjustment}`);
      console.log(`    highest     ${top}`);
    } else {
      console.log('    indicators  none (the page omits the basket, composite and history lines for the indicator mean)');
    }
    if (status.fundamentals) console.log(`    fundamentals ${status.fundamentals.length}`);
    return 0;
  } catch (error) {
    if (error instanceof StatusValidationError) {
      console.error(`FAIL ${error.message}`);
      return 1;
    }
    throw error;
  }
}

process.exitCode = await main();
