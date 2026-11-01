import assert from 'node:assert/strict';
import test from 'node:test';

import { allocationMatchesBooking } from '../src/lib/bookingOutcome.mjs';

test('recognizes the same persisted booking after an ambiguous network failure', () => {
  const payload = {
    name: 'No Photo Guest',
    phone: '9876543210',
    startDate: '2026-11-05',
    endDate: '2026-11-24',
  };

  assert.equal(allocationMatchesBooking({ ...payload, id: 501 }, payload), true);
  assert.equal(allocationMatchesBooking({ ...payload, phone: '9000000000' }, payload), false);
  assert.equal(allocationMatchesBooking(null, payload), false);
});
