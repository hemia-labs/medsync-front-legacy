// Same development-only boundary as licensing-demo. Never expose unfinished help in production.
export default process.env.NODE_ENV === 'development' ? [{
  path: '/ayuda',
  name: 'helpCenter',
  component: () => import(/* webpackChunkName: "help-center-preview" */ '../../views/Help/HelpCenter.vue'),
  meta: { title: 'Centro de ayuda - medsync', requireAuth: true, layout: 'admin' }
}] : [];
