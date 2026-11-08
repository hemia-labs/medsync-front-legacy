const SuperAdminRouterView = {
    render: function(createElement) {
        return createElement('router-view');
    }
};

export default [
    {
        path: '/super-admin',
        name: 'superAdmin',
        component: SuperAdminRouterView,
        redirect: { name: 'superAdminDashboard' },
        meta: { title: 'Administración general - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin' },
        children: [
            {
                path: 'dashboard',
                name: 'superAdminDashboard',
                component: () => import('@/views/super-admin/Dashboard.vue'),
                meta: { title: 'Panel de administración - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin' }
            },
            {
                path: 'businesses',
                name: 'superAdminBusinesses',
                component: () => import('@/views/super-admin/businesses/BusinessList.vue'),
                meta: { title: 'Administrar negocios - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Negocios' }
            },
            {
                path: 'users',
                name: 'superAdminUsers',
                component: () => import('@/views/super-admin/users/UserList.vue'),
                meta: { title: 'Administrar usuarios - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Usuarios' }
            },
            {
                path: 'sessions',
                name: 'superAdminSessions',
                component: () => import(/* webpackChunkName: "super-admin-sessions" */ '../../views/super-admin/sessions/ActiveSessions.vue'),
                meta: { title: 'Sesiones activas - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Sesiones activas' }
            },
            {
                path: 'legal-documents',
                name: 'superAdminLegalDocuments',
                component: () => import(/* webpackChunkName: "super-admin-legal-documents" */ '@/views/super-admin/LegalDocuments.vue'),
                meta: { title: 'Documentos legales - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Documentos legales' }
            },
            {
                path: 'audit',
                name: 'superAdminAudit',
                component: () => import(/* webpackChunkName: "super-admin-audit" */ '@/views/super-admin/Audit.vue'),
                meta: { title: 'Auditoría administrativa - medsync', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Auditoria administrativa' }
            }
        ]
    }
];
