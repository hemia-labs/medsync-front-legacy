export default [
    {
        path:'/px',
        name:'patient',
        component: () => import('../../views/Patient/Patient.vue'),
        meta: {title: 'Pacientes - medsync',  requireAuth: true, layout: 'admin'},
        children: [
            {
                path:'/px/new',
                name:'NewPx',
                component: () => import('../../views/Patient/PatientNew.vue'),
                meta: {title: 'Nuevo paciente - medsync',  requireAuth: true, layout: 'admin',  headertitle: 'Alta de Paciente', permission: 'px.new'},
            },
            {
                path:'/px/history/:id',
                name:'ShowPx',
                component: () => import('../../views/Patient/PatientShow.vue'),
                props: route => ({id: route.params.id}),
                meta: {title: 'Expediente del paciente - medsync',  requireAuth: true, layout: 'admin',  headertitle: '', permission: 'px.all'},
            },
            {
                path:'/px/all',
                name:'AllPatients',
                component: () => import('../../views/Patient/Patients.vue'),
                props: route => ({id: route.params.id}),
                meta: {title: 'Buscar pacientes - medsync',  requireAuth: true, layout: 'admin',  headertitle: 'Pacientes', permission: 'px.all'},
            }
        ]

    },
    {
        path:'/px/treatmentplan',
        name:'PlanTratamiento',
        redirect: '/px/all',
        meta: {title: 'Plan de tratamiento - medsync',  requireAuth: true, layout: 'admin', permission: 'px.tab.treatment'},

    },
    {
        path:'/px/dates',
        name:'Citas',
        component: () => import('../../views/dates/dates.vue'),
        meta: {title: 'Próximas citas - medsync',  requireAuth: true, layout: 'admin', headertitle: 'Citas', permission: 'px.dates'},

    },
    {
        path:'/px/monitoringplan',
        name:'PlanSeguimiento',
        redirect: '/px/all',
        meta: {title: 'Plan de seguimiento - medsync',  requireAuth: true, layout: 'admin', permission: 'px.tab.monitoring'},

    },
    {
        path:'/px/odontogram',
        name:'Odontograma',
        redirect: '/px/all',
        meta: {title: 'Odontograma - medsync',  requireAuth: true, layout: 'admin', permission: 'px.tab.odontogram'},

    },
    {
        path:'/px/photoManager',
        name:'Fotos',
        redirect: '/px/all',
        meta: {title: 'Fotografías - medsync',  requireAuth: true, layout: 'admin', permission: 'px.tab.photos'},

    },
    {
        path:'/px/radiographyManager',
        name:'Radiografias',
        redirect: '/px/all',
        meta: {title: 'Radiografías - medsync',  requireAuth: true, layout: 'admin', permission: 'px.radiography'},

    }
    
]
