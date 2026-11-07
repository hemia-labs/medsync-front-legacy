export default [
    {
        path:'/businesses',
        name:'businesses',
        redirect: { name: 'superAdminBusinesses' },
        meta: {title: 'Negocios - medsync', requireAuth: true, layout: 'admin', headertitle: 'Negocios', role: 'super_admin'},
    }
]
