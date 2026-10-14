export default [
    {
        path:'/inicio',
        name:'home',
        component: () => import('../../views/Home/Home.vue'),
        meta: {title: 'Inicio',  requireAuth: true, layout: 'admin'},
    },
    {
        path:'/dashboard',
        name:'dashboard',
        component: () => import('../../views/Dashboard/TenantDashboard.vue'),
        meta: {
            title: 'Dashboard',
            requireAuth: true,
            layout: 'admin',
            permissionsAny: ['dashboard.tenant', 'reports.dashboard', 'dashboard', 'dashboard.operations', 'dashboard.clinical', 'dashboard.financial']
        },
    }
]
