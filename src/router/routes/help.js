// Help is available in every build; the normal authenticated tenant layout still applies.
export default [{
  path: '/ayuda',
  name: 'helpCenter',
  component: () => import(/* webpackChunkName: "help-center" */ '../../views/Help/HelpCenter.vue'),
  meta: { title: 'Centro de ayuda - MedSync', requireAuth: true, layout: 'admin' }
}];
