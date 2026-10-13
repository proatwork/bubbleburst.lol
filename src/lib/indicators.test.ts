import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandForScore, formatReading, formatScore, groupMean, isSaturated, weightedMean } from './indicators.ts';

test('weightedMean weights scores and rounds to one decimal', () => {
  assert.equal(weightedMean([]), null);
  assert.equal(weightedMean([{ score: 100, weight: 1 }]), 100);
  assert.equal(weightedMean([{ score: 91.4, weight: 1.5 }, { score: 72, weight: 0.5 }, { score: 87, weight: 0.5 }]), 86.6);
  assert.equal(weightedMean([{ score: 10, weight: 1 }, { score: 20, weight: 3 }]), 17.5);
});

test('groupMean only sees its own group', () => {
  const items = [
    { score: 90, weight: 1, group: 'fragility' as const },
    { score: 30, weight: 2, group: 'trigger' as const },
    { score: 50, weight: 1, group: 'trigger' as const },
  ];
  assert.equal(groupMean(items, 'fragility'), 90);
  assert.equal(groupMean(items, 'trigger'), 36.7);
  assert.equal(groupMean(items, 'confirmation'), null);
});

test('bandForScore borrows the meter bands and shows 100 as critical, not burst', () => {
  assert.equal(bandForScore(0).id, 'calm');
  assert.equal(bandForScore(24.9).id, 'calm');
  assert.equal(bandForScore(25).id, 'inflating');
  assert.equal(bandForScore(74.9).id, 'stretched');
  assert.equal(bandForScore(75).id, 'critical');
  assert.equal(bandForScore(100).id, 'critical');
});

test('isSaturated marks a reading at or beyond the pre-burst reference', () => {
  assert.equal(isSaturated(99.9), false);
  assert.equal(isSaturated(100), true);
});

test('formatScore and formatReading', () => {
  assert.equal(formatScore(91.4), '91');
  assert.equal(formatScore(72.5), '73');
  assert.equal(formatScore(99.6), '99');
  assert.equal(formatScore(100), '100');
  assert.equal(formatReading(41.87), '41.87');
  assert.equal(formatReading(311), '311');
  assert.equal(formatReading(1453832), '1,453,832');
  assert.equal(formatReading(-11.54), '−11.54');
  assert.equal(formatReading(4.2), '4.2');
});
