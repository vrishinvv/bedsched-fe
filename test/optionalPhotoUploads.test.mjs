import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRequiredBookingPhotoErrors,
  hasMissingOptionalPhotos,
  resolveRequireBookingPhotos,
  uploadOptionalPhotos,
} from '../src/lib/optionalPhotoUploads.mjs';

test('a failed optional photo upload does not fail the booking preparation', async () => {
  const result = await uploadOptionalPhotos({
    person: { blob: { kind: 'person' }, key: 'person-new.jpg', existingKey: null },
    aadhaar: { blob: { kind: 'identity' }, key: 'identity-new.jpg', existingKey: null },
  }, async (_blob, type) => {
    if (type === 'person') throw new Error('S3 unavailable');
  });

  assert.deepEqual(result, {
    personPhotoKey: null,
    aadhaarPhotoKey: 'identity-new.jpg',
    failedPhotoTypes: ['person'],
  });
});

test('no selected photos produces an allocation payload without photo keys or failures', async () => {
  const result = await uploadOptionalPhotos({
    person: { blob: null, key: null, existingKey: null },
    aadhaar: { blob: null, key: null, existingKey: null },
  }, async () => {
    throw new Error('upload should not be called');
  });

  assert.deepEqual(result, {
    personPhotoKey: null,
    aadhaarPhotoKey: null,
    failedPhotoTypes: [],
  });
});

test('missing photo detection expects person and identity photos for guests and caretakers', () => {
  const partialPhotos = {
    personPhotoKey: 'person.jpg',
    aadhaarPhotoKey: null,
  };

  assert.equal(hasMissingOptionalPhotos(partialPhotos), true);
  assert.equal(hasMissingOptionalPhotos(partialPhotos), true);
  assert.equal(hasMissingOptionalPhotos({ personPhotoKey: null }), true);
  assert.equal(hasMissingOptionalPhotos({
    personPhotoKey: 'caretaker.jpg',
    aadhaarPhotoKey: 'caretaker-identity.jpg',
  }), false);
});

test('production requires both photos for guests and caretakers while dev stays optional', () => {
  assert.equal(resolveRequireBookingPhotos(undefined, 'sssenclave.vercel.app'), true);
  assert.equal(resolveRequireBookingPhotos(undefined, 'sssenclave-dev.vercel.app'), false);
  assert.deepEqual(getRequiredBookingPhotoErrors({
    photosRequired: true,
    personPhoto: { blob: { kind: 'person' } },
    aadhaarPhoto: {},
  }), ['Identity photo is required']);
  assert.deepEqual(getRequiredBookingPhotoErrors({
    photosRequired: true,
    isCaretaker: true,
  }), ['Caretaker photo is required', 'Caretaker identity photo is required']);
  assert.deepEqual(getRequiredBookingPhotoErrors({
    photosRequired: true,
    isCaretaker: true,
    personPhoto: { blob: { kind: 'caretaker' } },
  }), ['Caretaker identity photo is required']);
  assert.deepEqual(getRequiredBookingPhotoErrors({
    photosRequired: true,
    isCaretaker: true,
    personPhoto: { blob: { kind: 'caretaker' } },
    aadhaarPhoto: { blob: { kind: 'caretaker-identity' } },
  }), []);
  assert.deepEqual(getRequiredBookingPhotoErrors({ photosRequired: false }), []);
});
