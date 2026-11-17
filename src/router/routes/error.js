export default [
    {
        path: '/acceso-no-disponible', name: 'accessUnavailable',
        component: () => import('../../views/error/AccessUnavailable.vue'),
        meta: { title: 'Acceso no disponible - medsync', requireAuth: false, layout: 'default' }
    },
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
