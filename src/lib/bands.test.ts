import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANDS, bandFor, deltaFor } from './bands.ts';

test('bands cover 0..100 exactly once, in order, with no gaps', () => {
  let expectedMin = 0;
  for (const band of BANDS) {
    assert.equal(band.min, expectedMin, `band ${band.id} should start at ${expectedMin}`);
    expectedMin = band.max + 1;
  }
  assert.equal(expectedMin, 101);
});

test('boundary values map to the right band', () => {
  const cases: Array<[number, string]> = [
    [0, 'calm'], [24, 'calm'], [25, 'inflating'], [49, 'inflating'],
    [50, 'stretched'], [74, 'stretched'], [75, 'critical'], [99, 'critical'], [100, 'burst'],
  ];
  for (const [pressure, id] of cases) assert.equal(bandFor(pressure).id, id, `pressure ${pressure}`);
});

test('out-of-range or fractional pressure throws', () => {
  assert.throws(() => bandFor(-1), RangeError);
  assert.throws(() => bandFor(101), RangeError);
  assert.throws(() => bandFor(50.5), RangeError);
});

test('delta direction and absence', () => {
  assert.equal(deltaFor(72, undefined), null);
  assert.deepEqual(deltaFor(72, 68), { value: 4, direction: 'up' });
  assert.deepEqual(deltaFor(60, 68), { value: -8, direction: 'down' });
  assert.deepEqual(deltaFor(68, 68), { value: 0, direction: 'flat' });
});
