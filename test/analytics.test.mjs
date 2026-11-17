import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllocatorRanking,
  buildCategoryGenderSummary,
  buildGenderTotals,
  buildLocationSummaries,
  isValidAnalyticsRange,
  percent,
} from '../src/lib/analytics.mjs';

test('category and gender rows reconcile into readable summaries', () => {
  const summary = buildCategoryGenderSummary([
    { category: 'delegate', gender: 'male', count: '4' },
    { category: 'delegate', gender: 'female', count: '6' },
    { category: 'sevadal', gender: 'female', count: '9' },
  ]);

  assert.deepEqual(summary.find((row) => row.category === 'delegate'), {
    category: 'delegate', label: 'Delegates', male: 4, female: 6, other: 0, total: 10,
  });
  assert.deepEqual(buildGenderTotals(summary), { male: 4, female: 15, other: 0 });
});

test('location summaries preserve category and gender totals', () => {
  const locations = buildLocationSummaries([
    { location_id: 2, location_name: 'North', category: 'delegate', gender: 'male', count: 3 },
    { location_id: 2, location_name: 'North', category: 'delegate', gender: 'female', count: 2 },
    { location_id: 1, location_name: 'South', category: 'sevadal', gender: 'female', count: 8 },
  ]);

  assert.equal(locations[0].name, 'South');
  assert.equal(locations[0].total, 8);
  assert.equal(locations[1].total, 5);
  assert.equal(locations[1].categories.find((row) => row.category === 'delegate').female, 2);
});

test('allocator ranking is numeric, sorted, and bounded', () => {
  assert.deepEqual(buildAllocatorRanking([
    { username: 'B', count: '2' },
    { username: 'A', count: '12' },
    { username: 'C', count: '4' },
  ], 2).map(({ username, count }) => ({ username, count })), [
    { username: 'A', count: 12 },
    { username: 'C', count: 4 },
  ]);
});

test('percent and date range helpers handle zeros and invalid ranges', () => {
  assert.equal(percent(3, 4), 75);
  assert.equal(percent(0, 0), 0);
  assert.equal(isValidAnalyticsRange('2026-10-01', '2026-12-31'), true);
  assert.equal(isValidAnalyticsRange('2026-12-31', '2026-10-01'), false);
});
