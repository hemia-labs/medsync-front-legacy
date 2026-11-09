export default [
    {
        path:'/users',
        name:'users',
        component: () => import('../../views/User/DAUser.vue'),
        meta: {title: 'Usuarios - medsync',  requireAuth: true, layout: 'admin', headertitle: 'Administración'},
    }
]