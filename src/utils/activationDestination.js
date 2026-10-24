// Only typed, server-owned destinations. Never use checkout query parameters,
// local tutorial progress or the mere existence of a session as activation proof.
export function activationDestination(status) {
  if (!status) return null;
  if (status.nextAction === 'restricted') return { name: 'tenantRestricted' };
  if (!['setup_summary', 'home'].includes(status.nextAction) || status.commercialState !== 'activated' || !status.contact || !status.contact.emailVerified) return null;
  if (status.destination === 'summary') return { name: 'admin', query: { section: 'summary' } };
  if (status.destination === 'home') return { name: 'home' };
  return null;
}
