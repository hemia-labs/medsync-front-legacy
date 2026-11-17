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


export function trialChoiceEligible(status, now = Date.now()) {
  const time = status && Number.isFinite(Date.parse(status.serverNow)) ? Date.parse(status.serverNow) : now;
  return Boolean(status && status.subscriptionStatus === 'trial' && status.commercialState === 'activated'
    && status.welcomePending === true && status.contact && status.contact.emailVerified === true
    && Number.isFinite(Date.parse(status.trialEndsAt)) && Date.parse(status.trialEndsAt) > time
    && ['setup_summary', 'home'].includes(status.nextAction) && ['summary', 'home'].includes(status.destination));
}

export function activationChoiceDestination(status, now) {
  return trialChoiceEligible(status, now) ? { name: 'accountPlans', query: { onboarding: '1' } } : null;
}
