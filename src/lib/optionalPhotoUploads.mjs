export async function uploadOptionalPhotos(photos, uploadPhoto) {
  const result = {
    personPhotoKey: photos.person?.existingKey || null,
    aadhaarPhotoKey: photos.aadhaar?.existingKey || null,
    failedPhotoTypes: [],
  };

  const pending = [
    ['person', 'personPhotoKey', photos.person],
    ['aadhaar', 'aadhaarPhotoKey', photos.aadhaar],
  ].filter(([, , photo]) => photo?.blob && photo?.key);

  await Promise.all(pending.map(async ([type, resultKey, photo]) => {
    try {
      await uploadPhoto(photo.blob, type, photo.key);
      result[resultKey] = photo.key;
    } catch {
      result.failedPhotoTypes.push(type);
    }
  }));

  return result;
}

export function hasMissingOptionalPhotos(photoResult, { isCaretaker = false } = {}) {
  return !isCaretaker && (!photoResult?.personPhotoKey || !photoResult?.aadhaarPhotoKey);
}

export function resolveRequireBookingPhotos(configuredValue, hostname) {
  if (configuredValue !== undefined && configuredValue !== null && String(configuredValue).trim() !== '') {
    return String(configuredValue).trim().toLowerCase() === 'true';
  }
  return String(hostname || '').trim().toLowerCase() === 'sssenclave.vercel.app';
}

export function getRequiredBookingPhotoErrors({
  photosRequired = false,
  isCaretaker = false,
  isEdit = false,
  personPhoto,
  aadhaarPhoto,
} = {}) {
  if (!photosRequired || isCaretaker || isEdit) return [];
  const errors = [];
  if (!(personPhoto?.blob || personPhoto?.dataUrl || personPhoto?.existingKey)) {
    errors.push('Person photo is required');
  }
  if (!(aadhaarPhoto?.blob || aadhaarPhoto?.dataUrl || aadhaarPhoto?.existingKey)) {
    errors.push('Identity photo is required');
  }
  return errors;
}
