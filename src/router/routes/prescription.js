export default [
    {
        path: '/prescriptions',
        name: 'Prescriptions',
        component: () => import('../../views/prescriptions/Prescriptions.vue'),
        meta: {
            title: 'Recetas - MedSync',
            requireAuth: true,
            layout: 'admin',
            headertitle: 'Recetas',
            permission: 'prescriptions.global'
        }
    }
]
