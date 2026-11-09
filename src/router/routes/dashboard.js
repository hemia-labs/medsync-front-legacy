export default [
    { path:'/pulso', name:'business-pulse', component:()=>import(/* webpackChunkName: "business-pulse" */ '../../views/Pulse/Pulse.vue'), meta:{title:'Pulso del consultorio - medsync', requireAuth:true,layout:'admin',pulseAccess:true} },
    {
        path:'/inicio',
        name:'home',
        component: () => import('../../views/Home/Home.vue'),
        meta: {title: 'Inicio - medsync',  requireAuth: true, layout: 'admin'},
    },
    {
        path:'/dashboard',
        name:'dashboard',
        component: () => import('../../views/Dashboard/TenantDashboard.vue'),
        meta: {
            title: 'Análisis del consultorio - medsync',
            requireAuth: true,
            layout: 'admin',
            permissionsAny: ['dashboard.tenant', 'reports.dashboard', 'dashboard', 'dashboard.operations', 'dashboard.clinical', 'dashboard.financial']
        },
    }
]
