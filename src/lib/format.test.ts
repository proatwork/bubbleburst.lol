import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLongDate, formatLongTimestamp, formatShortDate, formatSigned, formatTimestamp } from './format.ts';

test('dates format in UTC without off-by-one', () => {
  assert.equal(formatLongDate('2026-10-13'), 'Tuesday, 13 October 2026');
  assert.equal(formatShortDate('2026-10-13'), '13 Oct 2026');
  assert.equal(formatTimestamp('2026-10-13T06:05:00Z'), '13 Oct 2026, 06:05 UTC');
  assert.equal(formatLongTimestamp('2026-10-13T06:05:00Z'), 'Tuesday, 13 October 2026, 06:05 UTC');
  assert.equal(formatShortDate('2026-10-13T23:30:00Z'), '13 Oct 2026');
  assert.equal(formatTimestamp('2026-10-13T08:45:00+03:00'), '13 Oct 2026, 05:45 UTC');
});

test('signed numbers use a real minus sign', () => {
  assert.equal(formatSigned(4), '+4');
  assert.equal(formatSigned(-3), '−3');
  assert.equal(formatSigned(0), '±0');
});
