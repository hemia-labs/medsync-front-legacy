const PERMISSIONS_KEY = 'permissions';

export const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter((permission) => typeof permission === 'string' && permission.length > 0);
};

export const setSessionPermissions = (session, permissions) => {
  if (session) {
    session.set(PERMISSIONS_KEY, normalizePermissions(permissions));
  }
};

export const getSessionPermissions = (session) => {
  if (!session) {
    return [];
  }

  return normalizePermissions(session.get(PERMISSIONS_KEY));
};

export const hasPermission = (permissions, permission) => {
  if (!permission) {
    return true;
  }

  return normalizePermissions(permissions).includes(permission);
};

export const hasAnyPermission = (permissions, permissionOptions) => {
  if (!Array.isArray(permissionOptions) || permissionOptions.length === 0) {
    return true;
  }

  return permissionOptions.some((permission) => hasPermission(permissions, permission));
};
