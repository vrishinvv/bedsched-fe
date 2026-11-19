export const DEFAULT_BOOKING_PHOTO_URL = '/sathya-sai-baba-default.jpg';

export async function loadDefaultBookingPhoto(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Photo loading is unavailable.');
  }

  const response = await fetchImpl(DEFAULT_BOOKING_PHOTO_URL, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error('The default photo could not be loaded.');
  }

  const blob = await response.blob();
  return {
    blob: blob.type === 'image/jpeg' ? blob : new Blob([blob], { type: 'image/jpeg' }),
    dataUrl: DEFAULT_BOOKING_PHOTO_URL,
  };
}
