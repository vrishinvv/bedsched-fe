export const BLOCK_TYPE_OPTIONS = Object.freeze([
  { value: 'both', label: 'Mixed' },
  { value: 'male_only', label: 'Men only' },
  { value: 'female_only', label: 'Women only' },
]);

const VALID_BLOCK_TYPES = new Set(BLOCK_TYPE_OPTIONS.map(({ value }) => value));

export class StructureFormError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'StructureFormError';
    this.field = field;
  }
}

export function validateStructureName(value, label = 'Name') {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw new StructureFormError(`${label} is required.`, 'name');
  if (name.length > 100) throw new StructureFormError(`${label} must be 100 characters or fewer.`, 'name');
  return name;
}

export function validateBlockForm(form) {
  const name = validateStructureName(form.name, 'Block name');
  const size = Number(form.size);
  if (!Number.isSafeInteger(size) || size < 1 || size > 10000) {
    throw new StructureFormError('Beds must be a whole number between 1 and 10,000.', 'size');
  }
  if (!VALID_BLOCK_TYPES.has(form.genderRestriction)) {
    throw new StructureFormError('Select a valid block type.', 'genderRestriction');
  }
  return { name, size, genderRestriction: form.genderRestriction };
}
