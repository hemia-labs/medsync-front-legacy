export default [
    {
        path:'/500',
        name:'500',
        component: () => import('../../views/error/500.vue'),
        meta: {title: 'Error del servidor - medsync',   requireAuth: false, layout: 'default'},
    },
    {
        path:'/tenant-restricted',
        name:'tenantRestricted',
        component: () => import('../../views/error/TenantRestricted.vue'),
        meta: {title: 'Acceso restringido - medsync', requireAuth: true, layout: 'admin', allowTenantRestricted: true},
    }
]
