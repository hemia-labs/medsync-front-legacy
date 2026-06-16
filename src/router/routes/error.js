export default [
    {
        path:'/500',
        name:'500',
        component: () => import('../../views/error/500.vue'),
        meta: {title: '500 - MedSync',   requireAuth: false, layout: 'default'},
    },
    {
        path:'/tenant-restricted',
        name:'tenantRestricted',
        component: () => import('../../views/error/TenantRestricted.vue'),
        meta: {title: 'Acceso restringido - MedSync', requireAuth: true, layout: 'admin', allowTenantRestricted: true},
    }
]
