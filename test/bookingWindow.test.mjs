import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOOKING_MAX_DATE,
  BOOKING_MIN_DATE,
  BOOKING_WINDOW_LABEL,
  isWithinBookingWindow,
} from '../src/lib/bookingWindow.mjs';

test('defines the 2026 booking window', () => {
  assert.equal(BOOKING_MIN_DATE, '2026-11-05');
  assert.equal(BOOKING_MAX_DATE, '2026-11-24');
  assert.equal(BOOKING_WINDOW_LABEL, 'Nov 5-24, 2026');
});

test('accepts both booking-window boundaries', () => {
  assert.equal(isWithinBookingWindow(BOOKING_MIN_DATE), true);
  assert.equal(isWithinBookingWindow(BOOKING_MAX_DATE), true);
});

test('accepts dates inside the booking window', () => {
  assert.equal(isWithinBookingWindow('2026-11-12'), true);
});

test('rejects dates outside the booking window', () => {
  assert.equal(isWithinBookingWindow('2026-11-04'), false);
  assert.equal(isWithinBookingWindow('2026-11-25'), false);
  assert.equal(isWithinBookingWindow('2025-11-12'), false);
  assert.equal(isWithinBookingWindow('2027-11-12'), false);
  assert.equal(isWithinBookingWindow('2026-11-5'), false);
  assert.equal(isWithinBookingWindow('not-a-date'), false);
  assert.equal(isWithinBookingWindow(''), false);
  assert.equal(isWithinBookingWindow(null), false);
  assert.equal(isWithinBookingWindow(undefined), false);
});
