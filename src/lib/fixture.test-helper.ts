import { readFileSync } from 'node:fs';
import type { Status } from './schema.ts';

const CONTENT_URL = new URL('../../content/status.json', import.meta.url);

/** A deep copy of the shipped content, safe to mutate in a test. */
export function loadFixture(): Status {
  return JSON.parse(readFileSync(CONTENT_URL, 'utf8')) as Status;
}
