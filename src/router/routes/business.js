export default [
    {
        path:'/businesses',
        name:'businesses',
        redirect: { name: 'superAdminBusinesses' },
        meta: {title: 'Negocios - MedSync', requireAuth: true, layout: 'admin', headertitle: 'Negocios', role: 'super_admin'},
    }
]
