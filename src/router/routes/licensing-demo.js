// Review-only route. Production has neither this route nor its lazy component.
export default process.env.NODE_ENV === 'development' ? [{
  path: '/activar-cuenta/demo',
  name: 'licenseActivationDemo',
  component: () => import('../../views/licensing/LicenseActivationDemo.vue'),
  meta: { title: 'Activación de prueba - MedSync', requireAuth: false, layout: 'default' }
}] : [];
