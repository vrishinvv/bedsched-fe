export function complementBulkGenderCounts(field, value, selectedCount) {
  const total = Math.max(0, Number.parseInt(selectedCount, 10) || 0);
  const entered = Math.max(0, Math.min(total, Number.parseInt(value, 10) || 0));
  if (field === 'femaleCount') {
    return { femaleCount: entered, maleCount: total - entered };
  }
  return { maleCount: entered, femaleCount: total - entered };
}
