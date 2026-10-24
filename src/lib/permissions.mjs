export function canManageAccommodationStructure(user) {
  return user?.role === 'admin';
}
