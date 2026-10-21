export const PULSE_PERMISSIONS = Object.freeze(['pulse.view.business', 'dashboard.scope.all', 'dashboard.operations', 'dashboard.clinical']);
export const canAccessPulse = (permissions, role) => role !== 'super_admin' && PULSE_PERMISSIONS.every(code => (permissions || []).includes(code));
