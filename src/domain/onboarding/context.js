export const ONBOARDING = 'CORE/ONBOARDING/';
export function guideContext(user, role, hasPermission, revision = 0, business = null) {
  const businessId=(business && business.id_business) || (user && user.id_business);
  if (!user || !user.id_login || !businessId || role === 'super_admin') return null;
  const codes=['px.dates','admin.config','admin.users','documents.config','prescriptions.config','clinical_history_template.view','clinical_history_template.manage'];
  return {user:user.id_login,business:businessId,key:JSON.stringify([user.id_login,businessId,role,revision,codes.map(code=>!!hasPermission(code))])};
}
