export function canManageAccommodationStructure(user) {
  return user?.role === 'admin';
}

export function canViewAnalytics(user) {
  return ['admin', 'dashboard'].includes(user?.role);
}
