export default [
    {
        path: '/login',
        name: 'login',
        component: () => import('../../views/Auth/Login.vue'),
        meta: { title: 'Iniciar sesión - medsync', requireAuth: false, layout: 'default' }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('../../views/Auth/Register.vue'),
        meta: { title: 'Crear cuenta - medsync', requireAuth: false, layout: 'default' }
    },
    {
        path: '/forgot-password',
        name: 'forgotPassword',
        component: () => import('../../views/Auth/Login.vue'),
        meta: { title: 'Recuperar contraseña - medsync', requireAuth: false, layout: 'default' }
    },
    { path: '/auth', name: 'auth', redirect: { name: 'login' } },
    { path: '/auth/login', redirect: { name: 'login' } },
    { path: '/auth/registro', redirect: { name: 'register' } },
    {
        path: '/activar-cuenta',
        name: 'accountActivation',
        component: () => import('../../views/Auth/AccountActivation.vue'),
        meta: { title: 'Verificar cuenta - medsync', requireAuth: true, allowTenantRestricted: true, layout: 'default' }
    }
];
