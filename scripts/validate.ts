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
