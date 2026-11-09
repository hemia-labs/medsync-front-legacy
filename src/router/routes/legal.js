export default [
    {
        path:'/privacy',
        name:'AvisoPrivacidad',
        component: () => import('../../views/legal/PublishedLegalDocument.vue'),
        props: { documentKey: 'privacy_notice' },
        meta: {title: 'Aviso de privacidad - medsync', requireAuth: false, layout: 'default'},
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
        meta: {title: 'Términos y condiciones - medsync', requireAuth: false, layout: 'default'},
    }
]
