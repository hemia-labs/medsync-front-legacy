export default [
    {
        path:'/admin',
        name:'admin',
        component: () => import('../../views/admin/index.vue'),
        meta: {title: 'Configuracion - MedSync', requireAuth: true, layout: 'admin', headertitle: 'Configuracion', settingsAccess: true},
    }
]
