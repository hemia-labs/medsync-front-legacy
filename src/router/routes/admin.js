export default [
    {
        path:'/admin',
        name:'admin',
        component: () => import('../../views/admin/index.vue'),
        meta: {title: 'Admin - MedSync',  requireAuth: true, layout: 'admin', headertitle: 'Administración', permission: 'admin.config'},
    }
]
