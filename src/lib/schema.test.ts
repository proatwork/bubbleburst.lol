import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, StatusValidationError } from './status.ts';
import { loadFixture } from './fixture.test-helper.ts';

function expectInvalid(raw: unknown, fragment: string) {
  assert.throws(
    () => parseStatus(raw),
    (error: unknown) => error instanceof StatusValidationError && error.problems.some((p) => p.includes(fragment)),
    `expected a validation problem containing "${fragment}"`,
  );
}

test('the shipped content/status.json is valid', () => {
  const status = parseStatus(loadFixture());
  assert.equal(status.pressure >= 0 && status.pressure <= 100, true);
});

test('pressure must be an integer from 0 to 100', () => {
  expectInvalid({ ...loadFixture(), pressure: 101 }, 'pressure');
  expectInvalid({ ...loadFixture(), pressure: -1 }, 'pressure');
  expectInvalid({ ...loadFixture(), pressure: 71.5 }, 'pressure');
});

test('a citation beyond the source list is rejected', () => {
  const s = loadFixture();
  s.analysis[0] = `${s.analysis[0]} [99]`;
  expectInvalid(s, 'only');
});

test('an analysis paragraph without a citation is rejected', () => {
  const s = loadFixture();
  s.analysis[1] = 'No sources here at all.';
  expectInvalid(s, 'must cite');
});

test('a source that is never cited is rejected', () => {
  const s = loadFixture();
  s.sources.push({ title: 'Unused', publisher: 'Nobody', url: 'https://example.com/unused', date: '2026-10-01' });
  expectInvalid(s, 'never cited');
});

test('duplicate source URLs are rejected', () => {
  const s = loadFixture();
  s.sources[1] = { ...s.sources[1], url: s.sources[0].url };
  expectInvalid(s, 'Duplicate source URL');
});

test('sources must use https', () => {
  const s = loadFixture();
  s.sources[0] = { ...s.sources[0], url: 'http://insecure.example.com/a' };
  expectInvalid(s, 'https');
});

test('updatedAt must be a timezone-qualified ISO timestamp that is not in the future', () => {
  expectInvalid({ ...loadFixture(), updatedAt: '2026-10-13' }, 'updatedAt');
  expectInvalid({ ...loadFixture(), updatedAt: '2026-10-13T08:45:00' }, 'timezone');
  expectInvalid({ ...loadFixture(), updatedAt: '2099-01-01T00:00:00Z' }, 'future');
  assert.doesNotThrow(() => parseStatus({ ...loadFixture(), updatedAt: '2026-10-12T08:45:00+03:00' }));
});

test('source dates must be real calendar dates', () => {
  const s = loadFixture();
  s.sources[0] = { ...s.sources[0], date: '2026-02-30' };
  expectInvalid(s, 'calendar');
});

test('unknown top-level keys are rejected so typos never ship silently', () => {
  expectInvalid({ ...loadFixture(), headlne: 'typo' }, 'headlne');
});

test('signal count and text lengths are bounded', () => {
  const s = loadFixture();
  s.signals = s.signals.slice(0, 2);
  expectInvalid(s, 'signals');
  const long = loadFixture();
  long.headline = 'x'.repeat(200);
  expectInvalid(long, 'headline');
});

test('citations in the summary are range-checked and count as citing', () => {
  const bad = loadFixture();
  bad.summary = `${bad.summary} [99]`;
  expectInvalid(bad, 'summary');

  const onlyInSummary = loadFixture();
  onlyInSummary.sources.push({ title: 'Summary-only source', publisher: 'Test', url: 'https://example.com/summary-only', date: '2026-10-01' });
  onlyInSummary.summary = `${onlyInSummary.summary} [${onlyInSummary.sources.length}]`;
  assert.doesNotThrow(() => parseStatus(onlyInSummary));
});
