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
    validateBlockForm({ name: ' Block 5 ', size: '80', genderRestriction: 'male_only' }),
    { name: 'Block 5', size: 80, genderRestriction: 'male_only' }
  );
});

test('rejects missing names, invalid sizes, and invalid block types', () => {
  const cases = [
    () => validateStructureName('   ', 'Location name'),
    () => validateBlockForm({ name: 'Block', size: '2.5', genderRestriction: 'both' }),
    () => validateBlockForm({ name: 'Block', size: '10', genderRestriction: 'vip' }),
  ];

  for (const operation of cases) {
    assert.throws(operation, (error) => error instanceof StructureFormError);
  }
});
