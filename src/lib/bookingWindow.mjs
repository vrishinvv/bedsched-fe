export const BOOKING_MIN_DATE = '2026-11-05';
export const BOOKING_MAX_DATE = '2026-11-24';
export const BOOKING_WINDOW_LABEL = 'Nov 5-24, 2026';

export function isWithinBookingWindow(date) {
  return typeof date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && date >= BOOKING_MIN_DATE
    && date <= BOOKING_MAX_DATE;
}
