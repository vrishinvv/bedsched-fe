import assert from 'node:assert/strict';
import test from 'node:test';

import {
  eligibleDelegateAllocations,
  resolveLookupCategoryChoice,
} from '../src/lib/accommodationEligibility.mjs';

test('a single Sai category is automatic while dual registration requires a choice', () => {
  assert.deepEqual(resolveLookupCategoryChoice(['sevadal']), {
    category: 'sevadal',
    requiresChoice: false,
  });
  assert.deepEqual(resolveLookupCategoryChoice(['delegate', 'sevadal']), {
    category: '',
    requiresChoice: true,
  });
});

test('only active delegates without a caretaker are offered as caretaker links', () => {
  const beds = {
    1: { id: 11, name: 'Delegate A', status: 'confirmed', accommodationCategory: 'delegate' },
    2: { id: 12, name: 'Delegate B', status: 'confirmed', accommodationCategory: 'delegate' },
    3: { id: 13, name: 'Helper', status: 'confirmed', accommodationCategory: 'devotee', caretakerForAllocationId: 12 },
    4: { id: 14, name: 'Reserved', status: 'reserved', accommodationCategory: 'delegate' },
  };
  assert.deepEqual(eligibleDelegateAllocations(beds), [
    { id: 11, bedNumber: 1, name: 'Delegate A', startDate: undefined, endDate: undefined },
  ]);
});
