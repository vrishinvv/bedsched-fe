export const ACCOMMODATION_CATEGORY_OPTIONS = Object.freeze([
  { value: 'delegate', label: 'Delegate' },
  { value: 'sevadal', label: 'Sevadal' },
  { value: 'devotee', label: 'Devotee' },
]);

export function resolveLookupCategoryChoice(verifiedCategories = []) {
  const eligible = ['delegate', 'sevadal'].filter((category) => verifiedCategories.includes(category));
  return {
    category: eligible.length === 1 ? eligible[0] : '',
    requiresChoice: eligible.length > 1,
  };
}

export function eligibleDelegateAllocations(beds = {}) {
  const linked = new Set(
    Object.values(beds)
      .map((allocation) => Number(allocation?.caretakerForAllocationId))
      .filter(Number.isFinite)
  );

  return Object.entries(beds)
    .filter(([, allocation]) => allocation?.status === 'confirmed'
      && allocation.accommodationCategory === 'delegate'
      && !linked.has(Number(allocation.id)))
    .map(([bedNumber, allocation]) => ({
      id: Number(allocation.id),
      bedNumber: Number(bedNumber),
      name: allocation.name,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
    }))
    .sort((left, right) => left.bedNumber - right.bedNumber);
}
