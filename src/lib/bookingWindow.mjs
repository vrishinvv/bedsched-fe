export const BOOKING_MIN_DATE = '2026-11-05';
export const BOOKING_MAX_DATE = '2026-11-24';
export const BOOKING_WINDOW_LABEL = 'Nov 5-24, 2026';

export function getDateInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getDefaultBookingDates(date = new Date()) {
  return {
    startDate: getDateInIndia(date),
    endDate: BOOKING_MAX_DATE,
  };
}

export function isWithinBookingWindow(date) {
  return typeof date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && date >= BOOKING_MIN_DATE
    && date <= BOOKING_MAX_DATE;
}
