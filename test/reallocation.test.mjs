import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReallocationContext } from '../src/lib/reallocation.mjs';

test('maps a search result into the shared reallocation modal context', () => {
  assert.deepEqual(buildReallocationContext({
    name: 'Delegate A',
    location_name: 'North',
    tent_name: 'North 7',
    block_name: 'N7B22',
    bed_number: 3,
    start_date: '2026-11-18',
    end_date: '2026-11-24',
    created_at: '2026-11-18 10:00:00',
    caretaker_for_name: 'Delegate B',
    caretaker_for_bed: 2,
    sai_connect_age: 42,
    caretaker_for_allocation_id: 99,
  }), {
    name: 'Delegate A',
    location: 'North',
    tent: 'North 7',
    block: 'N7B22',
    bed: 3,
    startDate: '2026-11-18',
    endDate: '2026-11-24',
    createdAt: '2026-11-18 10:00:00',
    caretakerForName: 'Delegate B',
    caretakerForBedNumber: 2,
    saiConnectAge: 42,
    isCaretaker: true,
  });
});
