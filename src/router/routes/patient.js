export default [
    {
        path:'/px',
        name:'patient',
        component: () => import('../../views/Patient/Patient.vue'),
        meta: {title: 'Px - Expedient',  requireAuth: true, layout: 'admin'},
        children: [
            {
                path:'/px/new',
                name:'NewPx',
                component: () => import('../../views/Patient/PatientNew.vue'),
                meta: {title: 'Px - Nuevo',  requireAuth: true, layout: 'admin',  headertitle: 'Alta de Paciente', permission: 'px.new'},
            },
            {
                path:'/px/history/:id',
                name:'ShowPx',
                component: () => import('../../views/Patient/PatientShow.vue'),
                props: route => ({id: route.params.id}),
                meta: {title: 'Px - Expediente',  requireAuth: true, layout: 'admin',  headertitle: '', permission: 'px.all'},
            },
            {
                path:'/px/all',
                name:'AllPatients',
                component: () => import('../../views/Patient/Patients.vue'),
                props: route => ({id: route.params.id}),
                meta: {title: 'Px - Buscador',  requireAuth: true, layout: 'admin',  headertitle: 'Pacientes', permission: 'px.all'},
            }
        ]

    },
    {
        path:'/px/treatmentplan',
        name:'PlanTratamiento',
        component: () => import('../../views/Patient/Sections/TreatmentPlan.vue'),
        meta: {title: 'Plan de Tratamiento - MedSync',  requireAuth: true, layout: 'admin', permission: 'px.tab.treatment'},

    },
    {
        path:'/px/dates',
        name:'Citas',
        component: () => import('../../views/dates/dates.vue'),
        meta: {title: 'Proximas Citas - MedSync',  requireAuth: true, layout: 'admin', headertitle: 'Citas', permission: 'px.dates'},

    },
    {
        path:'/px/monitoringplan',
        name:'PlanSeguimiento',
        component: () => import('../../views/Patient/Sections/MonitoringPlan.vue'),
        meta: {title: 'Plan de Seguimiento - MedSync',  requireAuth: true, layout: 'admin', permission: 'px.tab.monitoring'},

    },
    {
        path:'/px/odontogram',
        name:'Odontograma',
        component: () => import('../../views/Patient/Sections/Odontogram.vue'),
        meta: {title: 'Odontograma - MedSync',  requireAuth: true, layout: 'admin', permission: 'px.tab.odontogram'},

    },
    {
        path:'/px/photoManager',
        name:'Fotos',
        component: () => import('../../views/Patient/Sections/PhotoManager.vue'),
        meta: {title: 'Administrador de Foto - MedSync',  requireAuth: true, layout: 'admin', permission: 'px.tab.photos'},

    },
    {
        path:'/px/radiographyManager',
        name:'Radiografias',
        component: () => import('../../views/Patient/Sections/RadioManager.vue'),
        meta: {title: 'Gestor de Radiografias - MedSync',  requireAuth: true, layout: 'admin', permission: 'px.radiography'},

    }
    
]
