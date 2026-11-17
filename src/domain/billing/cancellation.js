// Only Billing's paid period and active license can promise continued access.
export function paidCancellationEnd(subscription, license, now = Date.now()) {
  if (!subscription || !license || !license.active || !['active', 'grace'].includes(license.licenseStatus)
    || license.productCode !== 'medsync' || license.subscriptionId !== subscription.id || license.planCode !== subscription.planCode) return null;
  const end = Math.min(Date.parse(subscription.currentPeriodEnd || subscription.nextBillingTime), Date.parse(license.validUntil));
  return end > now ? new Date(end).toISOString() : null;
}
export function cancellationIntentKey(store, subscription) {
  const user = store.state.CORE.AUTH.user || {};
  return 'medsync:cancel-renewal:' + JSON.stringify([user.id_login || user.id, user.id_session, subscription.organizationId, subscription.id]);
}
export function savedCancellationIntent(key) {
  try {
    const intent = JSON.parse(sessionStorage.getItem(key));
    return intent && typeof intent.expectedSubscriptionId === 'string' && Number.isFinite(Date.parse(intent.expectedPeriodEnd)) && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intent.idempotencyKey) ? { idempotencyKey: intent.idempotencyKey, expectedSubscriptionId: intent.expectedSubscriptionId, expectedPeriodEnd: intent.expectedPeriodEnd } : null;
  } catch (_) { return null; }
}
export function saveCancellationIntent(key, intent) {
  try { if (intent) sessionStorage.setItem(key, JSON.stringify(intent)); else sessionStorage.removeItem(key); }
  catch (_) { /* shortcut: blocked storage retains this key in memory; central deduplication still rejects conflicting intents after reload. */ }
}
