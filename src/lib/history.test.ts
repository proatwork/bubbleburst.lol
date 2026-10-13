import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeries, daysOf, indicatorHistory, slugFor } from './history.ts';

const a = { updatedAt: '2026-10-13T00:50:00Z', pressure: 70 };
const b = { updatedAt: '2026-10-13T08:59:16Z', pressure: 77, composite: { indicatorScore: 76.2, method: 'weighted-mean' }, indicators: [{ id: 'shillerCape', score: 91.4 }] };
const c = { updatedAt: '2026-10-14T06:00:00Z', pressure: 78, composite: { indicatorScore: 75.9 }, indicators: [{ id: 'shillerCape', score: 90.9 }, { id: 'nfci', score: 76 }] };

test('buildSeries sorts by time, de-duplicates equal timestamps and keeps what it needs', () => {
  const { points, rejected } = buildSeries({ 'c.json': c, 'a.json': a, 'b.json': b, 'live': { ...b, headline: 'ignored' } });
  assert.equal(rejected.length, 0);
  assert.deepEqual(points.map((p) => p.pressure), [70, 77, 78]);
  assert.equal(points[0].indicatorScore, undefined);
  assert.equal(points[1].indicatorScore, 76.2);
  assert.deepEqual(points[2].indicators, { shillerCape: 90.9, nfci: 76 });
});

test('buildSeries skips files it cannot read instead of failing the build', () => {
  const { points, rejected } = buildSeries({ 'bad.json': { pressure: 'high' }, 'old.json': { updatedAt: 'yesterday', pressure: 5 }, 'a.json': a });
  assert.equal(points.length, 1);
  assert.equal(rejected.length, 2);
  assert.match(rejected[0].reason, /updatedAt/);
});

test('indicatorHistory groups scores by id, oldest first', () => {
  const { points } = buildSeries({ a, b, c });
  const history = indicatorHistory(points);
  assert.deepEqual(history.get('shillerCape')?.map((p) => p.score), [91.4, 90.9]);
  assert.deepEqual(history.get('nfci')?.map((p) => p.score), [76]);
  assert.equal(history.get('missing'), undefined);
});

test('daysOf lists the UTC days covered', () => {
  const { points } = buildSeries({ a, b, c });
  assert.deepEqual(daysOf(points), ['2026-10-13', '2026-10-14']);
});

test('slugFor strips colons and fractional seconds', () => {
  assert.equal(slugFor('2026-10-13T07:46:03Z'), '2026-10-13T074603Z');
  assert.equal(slugFor('2026-10-13T07:46:03.250Z'), '2026-10-13T074603Z');
  assert.equal(slugFor('2026-10-13T10:46:03+03:00'), '2026-10-13T104603+0300');
});
