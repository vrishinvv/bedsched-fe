export const ANALYTICS_CATEGORIES = Object.freeze([
  { key: 'delegate', label: 'Delegates' },
  { key: 'sevadal', label: 'Sevadals' },
  { key: 'devotee', label: 'Devotees' },
  { key: 'caretaker', label: 'Caretakers' },
]);

export const ANALYTICS_GENDERS = Object.freeze([
  { key: 'male', label: 'Men' },
  { key: 'female', label: 'Women' },
  { key: 'other', label: 'Other' },
]);

function count(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyGenderCounts() {
  return { male: 0, female: 0, other: 0 };
}

function emptyCategory(category) {
  return {
    category,
    label: ANALYTICS_CATEGORIES.find((item) => item.key === category)?.label || category,
    ...emptyGenderCounts(),
    total: 0,
  };
}

export function buildCategoryGenderSummary(rows = []) {
  const categories = new Map(ANALYTICS_CATEGORIES.map(({ key }) => [key, emptyCategory(key)]));

  for (const row of rows) {
    const category = String(row?.category || 'devotee').toLowerCase();
    const gender = String(row?.gender || 'other').toLowerCase();
    if (!categories.has(category)) categories.set(category, emptyCategory(category));
    const target = categories.get(category);
    const genderKey = Object.hasOwn(target, gender) ? gender : 'other';
    const value = count(row?.count);
    target[genderKey] += value;
    target.total += value;
  }

  return Array.from(categories.values());
}

export function buildLocationSummaries(rows = []) {
  const locations = new Map();

  for (const row of rows) {
    const locationId = Number(row?.location_id || 0);
    const name = row?.location_name || 'Unknown location';
    const key = locationId || name;
    if (!locations.has(key)) {
      locations.set(key, {
        id: locationId,
        name,
        total: 0,
        genders: emptyGenderCounts(),
        categories: new Map(ANALYTICS_CATEGORIES.map(({ key: category }) => [category, emptyCategory(category)])),
      });
    }

    const location = locations.get(key);
    const category = String(row?.category || 'devotee').toLowerCase();
    const gender = String(row?.gender || 'other').toLowerCase();
    const genderKey = Object.hasOwn(location.genders, gender) ? gender : 'other';
    const value = count(row?.count);
    if (!location.categories.has(category)) location.categories.set(category, emptyCategory(category));
    const categoryRow = location.categories.get(category);

    location.total += value;
    location.genders[genderKey] += value;
    categoryRow[genderKey] += value;
    categoryRow.total += value;
  }

  return Array.from(locations.values())
    .map((location) => ({ ...location, categories: Array.from(location.categories.values()) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function buildGenderTotals(categoryRows = []) {
  return categoryRows.reduce((totals, row) => ({
    male: totals.male + count(row?.male),
    female: totals.female + count(row?.female),
    other: totals.other + count(row?.other),
  }), emptyGenderCounts());
}

export function buildAllocatorRanking(rows = [], limit = 10) {
  return rows
    .map((row) => ({
      username: row?.username || 'Unknown',
      count: count(row?.count),
      locationNames: Array.isArray(row?.locationNames) ? row.locationNames : [],
    }))
    .sort((a, b) => b.count - a.count || a.username.localeCompare(b.username))
    .slice(0, limit);
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((count(part) / count(total)) * 1000) / 10;
}

export function isValidAnalyticsRange(startDate, endDate) {
  return Boolean(startDate && endDate && startDate <= endDate);
}
