import { usableAttempt, safePaymentUrl, checkoutAttemptId } from './checkout';

const money = value => typeof value === 'string' && /^\d+\.\d{2}$/.test(value);
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const states = ['preparing', 'awaiting_approval', 'scheduled', 'effective', 'failed'];

export function usablePlanChangeQuote(value) {
  return Boolean(value && ['upgrade', 'downgrade'].includes(value.kind) && money(value.amountDueNow) && money(value.recurringAmount)
    && /^[A-Z]{3}$/.test(value.currency) && date(value.effectiveAt) && date(value.nextBillingAt));
}

export function usablePlanChangeAttempt(value, id) {
  if (!usableAttempt(value, id) || value.operation !== 'change_plan' || !value.planCode || !value.planPriceCode) return false;
  if (value.status !== 'ready') return true;
  const change = value.planChange;
  return Boolean(value.subscriptionId && change && states.includes(change.state) && date(change.effectiveAt)
    && (change.action === undefined || ['approve_subscription', 'approve_payment', 'none'].includes(change.action))
    && (change.kind === undefined || usablePlanChangeQuote(change)));
}

export function planChangeSnapshotApplied(attempt, snapshot, organizationId, now = Date.now()) {
  if (!attempt || attempt.operation !== 'change_plan' || attempt.status !== 'ready' || attempt.abandoned === true
    || !attempt.planChange || attempt.planChange.state !== 'effective' || !snapshot || snapshot.organizationId !== organizationId || snapshot.productCode !== 'medsync') return false;
  const sub = snapshot.subscription, license = snapshot.license;
  return Boolean(sub && license && sub.organizationId === organizationId && sub.productCode === 'medsync' && sub.status === 'active'
    && sub.id === attempt.subscriptionId && sub.planCode === attempt.planCode && sub.planPriceCode === attempt.planPriceCode
    && license.productCode === 'medsync' && license.active === true && license.licenseStatus === 'active'
    && license.subscriptionId === sub.id && license.planCode === sub.planCode
    && (license.validUntil === null || date(license.validUntil) && Date.parse(license.validUntil) > now));
}

export function planChangePaymentUrl(value) {
  const secure = safePaymentUrl(value);
  if (!secure) return '';
  const host = new URL(secure).hostname;
  return ['www.paypal.com', 'www.sandbox.paypal.com'].includes(host) ? secure : '';
}

export function planChangeOwner(store) {
  const getters = store.getters || {}, auth = store.state && store.state.CORE && store.state.CORE.AUTH || {};
  const business = getters['CORE/AUTH/getBusiness'] || auth.business || {}, user = getters['CORE/AUTH/getUser'] || auth.user || {};
  return JSON.stringify([business.id_business, user.id_login, user.id_session, getters['CORE/AUTH/getRole'] || auth.role]);
}

export function rememberPlanChangeDiscard(id, owner, offer = null) {
  if (!checkoutAttemptId(id) || typeof owner !== 'string' || !owner) return false;
  const planCode = offer && offer.planCode || '', planPriceCode = offer && offer.planPriceCode || '';
  if (typeof planCode !== 'string' || typeof planPriceCode !== 'string' || Boolean(planCode) !== Boolean(planPriceCode)) return false;
  try { sessionStorage.setItem('medsync.plan-change.discard.' + id, JSON.stringify({ attemptId: id, owner, planCode, planPriceCode })); return true; }
  catch (_) { return false; }
}

export function loadPlanChangeDiscard(id, owner) {
  if (!checkoutAttemptId(id)) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem('medsync.plan-change.discard.' + id));
    return value && value.attemptId === id && value.owner === owner && typeof value.planCode === 'string' && typeof value.planPriceCode === 'string'
      && Boolean(value.planCode) === Boolean(value.planPriceCode) ? { attemptId: id, owner, planCode: value.planCode, planPriceCode: value.planPriceCode } : null;
  } catch (_) { return null; }
}

export function forgetPlanChangeDiscard(id) {
  try { sessionStorage.removeItem('medsync.plan-change.discard.' + id); } catch (_) { /* The canonical cancellation remains in Billing. */ }
}

export function cancelledPlanChange(attempt) {
  return Boolean(attempt && attempt.operation === 'change_plan' && attempt.status === 'rejected' && attempt.statusFresh === true
    && attempt.checkoutStatus === 'cancelled' && attempt.errorCode === 'PAYMENT_ATTEMPT_CANCELLED' && !attempt.abandoned
    && (!attempt.planChange || attempt.planChange.state === 'failed' && attempt.planChange.action === 'none'));
}
