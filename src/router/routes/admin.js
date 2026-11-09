export default [
    {
        path:'/admin',
        name:'admin',
        component: () => import('../../views/admin/index.vue'),
        meta: {title: 'Configuración - medsync', requireAuth: true, layout: 'admin', headertitle: 'Configuración', settingsAccess: true},
    }
]
