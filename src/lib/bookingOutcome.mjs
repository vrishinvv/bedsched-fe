function normalize(value) {
  return String(value ?? '').trim();
}

export function allocationMatchesBooking(allocation, payload) {
  if (!allocation || !payload) return false;

  return (
    normalize(allocation.name).toLowerCase() === normalize(payload.name).toLowerCase()
    && normalize(allocation.phone) === normalize(payload.phone)
    && normalize(allocation.startDate) === normalize(payload.startDate)
    && normalize(allocation.endDate) === normalize(payload.endDate)
  );
}
