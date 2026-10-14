export const TENANT_NAVIGATION_TYPES = Object.freeze({
  SECTION: 'section',
  ACTION: 'action',
  SESSION: 'session'
});

export const TENANT_NAVIGATION_GROUPS = Object.freeze({
  OPERATION: 'operation',
  CLINICAL: 'clinical',
  MANAGEMENT: 'management',
  SESSION: 'session'
});

export const tenantNavigationItems = [
  {
    key: 'home',
    label: 'Inicio',
    icon: 'mdi-home-outline',
    routeName: 'home',
    path: '/inicio',
    permission: null,
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.OPERATION,
    order: 10,
    activeRouteNames: ['home'],
    activePathPrefixes: ['/inicio'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'newPatient',
    label: 'Nuevo paciente',
    icon: 'mdi-account-plus-outline',
    routeName: 'NewPx',
    path: '/px/new',
    permission: 'px.new',
    type: TENANT_NAVIGATION_TYPES.ACTION,
    group: TENANT_NAVIGATION_GROUPS.OPERATION,
    order: 20,
    activeRouteNames: ['NewPx'],
    activePathPrefixes: ['/px/new'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'patients',
    label: 'Pacientes',
    icon: 'mdi-account-group-outline',
    routeName: 'AllPatients',
    path: '/px/all',
    permission: 'px.all',
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.OPERATION,
    order: 30,
    activeRouteNames: ['AllPatients', 'ShowPx', 'patient'],
    activePathPrefixes: ['/px/all', '/px/history'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'appointments',
    label: 'Citas',
    icon: 'mdi-calendar-month-outline',
    routeName: 'Citas',
    path: '/px/dates',
    permission: 'px.dates',
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.OPERATION,
    order: 40,
    activeRouteNames: ['Citas'],
    activePathPrefixes: ['/px/dates'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'prescriptions',
    label: 'Recetas',
    icon: 'mdi-file-document-edit-outline',
    routeName: 'Prescriptions',
    path: '/prescriptions',
    permission: 'prescriptions.global',
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.CLINICAL,
    order: 50,
    activeRouteNames: ['Prescriptions'],
    activePathPrefixes: ['/prescriptions'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'mdi-view-dashboard-outline',
    routeName: 'dashboard',
    path: '/dashboard',
    permission: 'dashboard',
    permissionsAny: ['dashboard.tenant', 'reports.dashboard', 'dashboard', 'dashboard.operations', 'dashboard.clinical', 'dashboard.financial'],
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.MANAGEMENT,
    order: 55,
    activeRouteNames: ['dashboard'],
    activePathPrefixes: ['/dashboard'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'settings',
    label: 'Configuracion',
    icon: 'mdi-cog-outline',
    routeName: 'admin',
    path: '/admin',
    permission: null,
    settingsAccess: true,
    type: TENANT_NAVIGATION_TYPES.SECTION,
    group: TENANT_NAVIGATION_GROUPS.MANAGEMENT,
    order: 60,
    activeRouteNames: ['admin'],
    activePathPrefixes: ['/admin'],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  },
  {
    key: 'logout',
    label: 'Salir',
    icon: 'mdi-logout',
    routeName: null,
    path: null,
    permission: null,
    type: TENANT_NAVIGATION_TYPES.SESSION,
    group: TENANT_NAVIGATION_GROUPS.SESSION,
    order: 100,
    activeRouteNames: [],
    activePathPrefixes: [],
    feature: null,
    unavailableBehavior: null,
    upgradeTo: null
  }
];

export function sortTenantNavigationItems(items) {
  return [...items].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}

export function getTenantNavigationItemsByType(type) {
  return sortTenantNavigationItems(tenantNavigationItems.filter((item) => item.type === type));
}
