import assert from 'node:assert/strict';
import test from 'node:test';

import { complementBulkGenderCounts } from '../src/lib/bulkBooking.mjs';

test('editing either gender count fills the other from the selected-bed total', () => {
  assert.deepEqual(complementBulkGenderCounts('femaleCount', 3, 10), {
    femaleCount: 3,
    maleCount: 7,
  });
  assert.deepEqual(complementBulkGenderCounts('maleCount', 4, 10), {
    maleCount: 4,
    femaleCount: 6,
  });
});

test('complementary gender counts are clamped to the selected-bed total', () => {
  assert.deepEqual(complementBulkGenderCounts('femaleCount', 99, 10), {
    femaleCount: 10,
    maleCount: 0,
  });
  assert.deepEqual(complementBulkGenderCounts('maleCount', -2, 10), {
    maleCount: 0,
    femaleCount: 10,
  });
});
