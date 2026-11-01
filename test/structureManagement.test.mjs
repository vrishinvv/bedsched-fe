import assert from 'node:assert/strict';
import test from 'node:test';
import {
  StructureFormError,
  validateBlockForm,
  validateStructureName,
} from '../src/lib/structureManagement.mjs';

test('normalizes structure names', () => {
  assert.equal(validateStructureName('  East Wing  ', 'Tent name'), 'East Wing');
});

test('normalizes a valid block form', () => {
  assert.deepEqual(
    validateBlockForm({ name: ' Block 5 ', size: '80', genderRestriction: 'male_only', allowedCategories: ['delegate', 'sevadal'], minimumAge: '70' }),
    { name: 'Block 5', size: 80, genderRestriction: 'male_only', allowedCategories: ['delegate', 'sevadal'], minimumAge: 70 }
  );
});

test('rejects missing names, invalid sizes, and invalid block types', () => {
  const cases = [
    () => validateStructureName('   ', 'Location name'),
    () => validateBlockForm({ name: 'Block', size: '2.5', genderRestriction: 'both', allowedCategories: ['devotee'] }),
    () => validateBlockForm({ name: 'Block', size: '10', genderRestriction: 'vip', allowedCategories: ['devotee'] }),
    () => validateBlockForm({ name: 'Block', size: '10', genderRestriction: 'both', allowedCategories: [] }),
    () => validateBlockForm({ name: 'Block', size: '10', genderRestriction: 'both', allowedCategories: ['devotee'], minimumAge: -1 }),
    () => validateBlockForm({ name: 'Block', size: '10', genderRestriction: 'both', allowedCategories: ['devotee'], minimumAge: 131 }),
  ];

  for (const operation of cases) {
    assert.throws(operation, (error) => error instanceof StructureFormError);
  }
});
