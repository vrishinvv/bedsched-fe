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

export function getAgeEarmarkWarning({ minimumAge = 0, age = null, isCaretaker = false } = {}) {
  const normalizedMinimumAge = Number(minimumAge);
  if (isCaretaker || !Number.isSafeInteger(normalizedMinimumAge) || normalizedMinimumAge <= 0) return '';

  const normalizedAge = age === null || age === undefined || age === '' ? null : Number(age);
  if (!Number.isSafeInteger(normalizedAge)) {
    return `This block is earmarked for guests aged ${normalizedMinimumAge} or older, but this person’s age could not be verified.`;
  }
  if (normalizedAge < normalizedMinimumAge) {
    return `This block is earmarked for guests aged ${normalizedMinimumAge} or older. Sai Connect reports age ${normalizedAge}.`;
  }
  return '';
}
