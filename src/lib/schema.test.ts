import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, StatusValidationError } from './status.ts';
import { BASELINE_SOURCE_COUNT, loadBasketFixture, loadFixture, loadShippedStatus } from './fixture.test-helper.ts';

function expectInvalid(raw: unknown, fragment: string) {
  assert.throws(
    () => parseStatus(raw),
    (error: unknown) => error instanceof StatusValidationError && error.problems.some((p) => p.includes(fragment)),
    `expected a validation problem containing "${fragment}"`,
  );
}

test('the shipped content/status.json is valid', () => {
  const status = parseStatus(loadShippedStatus());
  assert.equal(status.pressure >= 0 && status.pressure <= 100, true);
});

test('the static fixtures are valid and never share a URL with the shipped content', () => {
  assert.doesNotThrow(() => parseStatus(loadFixture()));
  assert.doesNotThrow(() => parseStatus(loadBasketFixture()));
  const shipped = new Set(loadShippedStatus().sources.map((source) => source.url));
  for (const source of loadBasketFixture().sources) {
    assert.equal(new URL(source.url).hostname, 'example.com', `fixture source ${source.url} must live under example.com`);
    assert.equal(shipped.has(source.url), false, `fixture source ${source.url} collides with the shipped content`);
  }
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

// ---- indicator basket ----------------------------------------------------------------------

test('a status with a consistent indicator basket is valid', () => {
  const status = parseStatus(loadBasketFixture());
  assert.equal(status.indicators?.length, 3);
  assert.equal(status.composite?.indicatorScore, 86.6);
});

test('a source cited only by an indicator counts as cited', () => {
  assert.doesNotThrow(() => parseStatus(loadBasketFixture()));
  const s = loadBasketFixture();
  s.indicators![0].sources = s.indicators![1].sources; // the first indicator's page is now cited by nobody
  expectInvalid(s, 'never cited');
});

test('indicatorScore must match the weighted mean of the listed scores', () => {
  const s = loadBasketFixture();
  s.composite!.indicatorScore = 70;
  expectInvalid(s, 'does not match the weighted mean');
  s.composite!.indicatorScore = 87.5; // within the 1-point tolerance of 86.6
  assert.doesNotThrow(() => parseStatus(s));
});

test('sub-scores must match their group means', () => {
  const s = loadBasketFixture();
  s.composite!.triggerScore = 40;
  expectInvalid(s, 'triggerScore 40 does not match');
});

test('a sub-score for an empty group is rejected', () => {
  const s = loadBasketFixture();
  s.indicators!.forEach((i) => { i.group = 'fragility'; });
  s.composite!.fragilityScore = 86.6;
  delete s.composite!.triggerScore;
  expectInvalid({ ...s }, 'no indicator has group "confirmation"');
});

test('composite is required with indicators, and indicators are required with composite', () => {
  const s = loadBasketFixture();
  delete s.composite;
  expectInvalid(s, 'composite is required');
  const t = loadBasketFixture();
  delete t.indicators;
  t.sources.splice(BASELINE_SOURCE_COUNT, 3); // drop the three indicator pages nobody cites any more
  t.fundamentals![0].sources = [BASELINE_SOURCE_COUNT + 1]; // the fundamentals page moved up by three
  expectInvalid(t, 'needs an indicators list');
});

test('indicatorCount must equal the number of indicators listed', () => {
  const s = loadBasketFixture();
  s.composite!.indicatorCount = 2;
  expectInvalid(s, 'indicatorCount 2 but 3');
});

test('duplicate indicator ids are rejected', () => {
  const s = loadBasketFixture();
  s.indicators![1].id = s.indicators![0].id;
  expectInvalid(s, 'Duplicate indicator id');
});

test('indicator ids are camelCase and scores are one-decimal numbers from 0 to 100', () => {
  const s = loadBasketFixture();
  s.indicators![0].id = 'Shiller CAPE';
  expectInvalid(s, 'camelCase');
  const t = loadBasketFixture();
  t.indicators![0].score = 91.44;
  expectInvalid(t, 'one decimal');
  const u = loadBasketFixture();
  u.indicators![0].score = 101;
  expectInvalid(u, 'score');
});

test('asOf must be a real calendar date', () => {
  const s = loadBasketFixture();
  s.indicators![0].asOf = '2026-02-30';
  expectInvalid(s, 'calendar date');
});

test('indicator weights stay between 0.5 and 2', () => {
  const s = loadBasketFixture();
  s.indicators![0].weight = 3;
  expectInvalid(s, 'weight');
});

test('the news adjustment is a small integer', () => {
  const s = loadBasketFixture();
  s.composite!.newsAdjustment = 9;
  expectInvalid(s, 'newsAdjustment');
  s.composite!.newsAdjustment = 1.5;
  expectInvalid(s, 'newsAdjustment');
});

test('fundamentals tiles cite real sources', () => {
  const s = loadBasketFixture();
  s.fundamentals![0].sources = [99];
  expectInvalid(s, 'only');
});

test('up to 30 sources are accepted', () => {
  const s = loadBasketFixture();
  while (s.sources.length < 30) {
    const n = s.sources.length + 1;
    s.sources.push({ title: `Extra ${n}`, publisher: 'Test', url: `https://example.com/${n}`, date: '2026-10-01' });
    s.signals[0].sources.push(n);
  }
  assert.doesNotThrow(() => parseStatus(s));
  const n = s.sources.length + 1;
  s.sources.push({ title: `Extra ${n}`, publisher: 'Test', url: `https://example.com/${n}`, date: '2026-10-01' });
  s.signals[0].sources.push(n);
  expectInvalid(s, 'sources');
});
