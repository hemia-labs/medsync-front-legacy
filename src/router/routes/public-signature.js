export default [
    {
        path: '/sign/d/:token',
        name: 'PublicDocumentSignature',
        component: () => import('../../views/public/PublicDocumentSignature.vue'),
        meta: {
            title: 'Firma de documento - medsync',
            requireAuth: false,
            layout: 'default'
        }
    }
];
