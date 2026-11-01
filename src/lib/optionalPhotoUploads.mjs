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
