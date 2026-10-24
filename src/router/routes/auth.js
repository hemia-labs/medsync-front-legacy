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
            },
            {
                path: '/auth/registro',
                name: 'register',
                component: () => import('../../views/Auth/Register.vue'),
                meta: { title: 'Crear cuenta - MedSync', requireAuth: false, layout: 'default' }
            }
        ]
    },
    {
        path: '/activar-cuenta',
        name: 'accountActivation',
        component: () => import('../../views/Auth/AccountActivation.vue'),
        meta: { title: 'Verificar cuenta - MedSync', requireAuth: true, allowTenantRestricted: true, layout: 'default' }
    }
]
