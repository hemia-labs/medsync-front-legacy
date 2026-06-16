export default [
    {
        path:'/auth',
        name:'auth',
        redirect: '/auth/login',
        component: () => import('../../views/Auth/index.vue'),
        meta: {title: 'Auth - MedSync',   requireAuth: false, layout: 'default'},
        children: [
            {
                path:'/auth/login',
                name:'login',
                component: () => import('../../views/Auth/Login.vue'),
                meta: {title: 'Login - MedSync',  requireAuth: false, layout: 'default'},
            }
        ]
    }
]