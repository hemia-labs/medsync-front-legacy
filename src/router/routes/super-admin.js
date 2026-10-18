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
        meta: { title: 'Super Admin - MedSync', requireAuth: true, layout: 'super-admin', role: 'super_admin' },
        children: [
            {
                path: 'dashboard',
                name: 'superAdminDashboard',
                component: () => import('@/views/super-admin/Dashboard.vue'),
                meta: { title: 'Super Admin - Dashboard', requireAuth: true, layout: 'super-admin', role: 'super_admin' }
            },
            {
                path: 'businesses',
                name: 'superAdminBusinesses',
                component: () => import('@/views/super-admin/businesses/BusinessList.vue'),
                meta: { title: 'Super Admin - Negocios', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Negocios' }
            },
            {
                path: 'users',
                name: 'superAdminUsers',
                component: () => import('@/views/super-admin/users/UserList.vue'),
                meta: { title: 'Super Admin - Usuarios', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Usuarios' }
            },
            {
                path: 'sessions',
                name: 'superAdminSessions',
                component: () => import(/* webpackChunkName: "super-admin-sessions" */ '../../views/super-admin/sessions/ActiveSessions.vue'),
                meta: { title: 'Super Admin - Sesiones activas', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Sesiones activas' }
            },
            {
                path: 'legal-documents',
                name: 'superAdminLegalDocuments',
                component: () => import(/* webpackChunkName: "super-admin-legal-documents" */ '@/views/super-admin/LegalDocuments.vue'),
                meta: { title: 'Super Admin - Documentos legales', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Documentos legales' }
            },
            {
                path: 'audit',
                name: 'superAdminAudit',
                component: () => import(/* webpackChunkName: "super-admin-audit" */ '@/views/super-admin/Audit.vue'),
                meta: { title: 'Super Admin - Auditoria', requireAuth: true, layout: 'super-admin', role: 'super_admin', headertitle: 'Auditoria administrativa' }
            }
        ]
    }
];
