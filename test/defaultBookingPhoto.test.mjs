import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_BOOKING_PHOTO_URL,
  loadDefaultBookingPhoto,
} from '../src/lib/defaultBookingPhoto.mjs';

test('loads the bundled Sathya Sai Baba photo as a reusable JPEG booking photo', async () => {
  const sourceBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
  let request;

  const photo = await loadDefaultBookingPhoto(async (url, options) => {
    request = { url, options };
    return { ok: true, blob: async () => sourceBlob };
  });

  assert.deepEqual(request, {
    url: DEFAULT_BOOKING_PHOTO_URL,
    options: { cache: 'force-cache' },
  });
  assert.strictEqual(photo.blob, sourceBlob);
  assert.equal(photo.dataUrl, DEFAULT_BOOKING_PHOTO_URL);
});

test('fails clearly when the bundled default photo is unavailable', async () => {
  await assert.rejects(
    loadDefaultBookingPhoto(async () => ({ ok: false })),
    /default photo could not be loaded/i,
  );
});
