export default [
    {
        path:'/privacy',
        name:'AvisoPrivacidad',
        component: () => import('../../views/legal/PublishedLegalDocument.vue'),
        props: { documentKey: 'privacy_notice' },
        meta: {title: 'Aviso de Privacidad - MedSync.mx', requireAuth: false, layout: 'default'},
    },
    {
        path:'/privacity',
        redirect: '/privacy',
    },
    {
        path:'/aviso-de-privacidad',
        redirect: '/privacy',
    },
    {
        path:'/terms-and-conditions',
        name:'TerminosCondiciones',
        component: () => import('../../views/legal/PublishedLegalDocument.vue'),
        props: { documentKey: 'terms_conditions' },
        meta: {title: 'Términos y Condiciones - MedSync.mx', requireAuth: false, layout: 'default'},
    }
]
