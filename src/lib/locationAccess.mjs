export function getUserLocationIds(user) {
  const ids = Array.isArray(user?.locationIds) && user.locationIds.length > 0
    ? user.locationIds
    : [user?.locationId];

  return [...new Set(ids.map(Number).filter(Number.isInteger))];
}

export function canAccessLocation(user, locationId) {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'location_user') return false;
  return getUserLocationIds(user).includes(Number(locationId));
}

export function filterBatchesForUser(batches, user) {
  if (user?.role !== 'location_user') return batches;
  const allowed = new Set(getUserLocationIds(user));
  return batches
    .map((batch) => ({
      ...batch,
      items: (batch.items || []).filter((item) => allowed.has(Number(item.locationId))),
    }))
    .filter((batch) => batch.items.length > 0);
}
