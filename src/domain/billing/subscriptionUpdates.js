const revision = value => typeof value === 'string' && /^[1-9]\d{0,64}$/.test(value);

export function newerSubscriptionSnapshot(snapshot, organizationId, previousRevision) {
  if (!snapshot || snapshot.organizationId !== organizationId || snapshot.productCode !== 'medsync' || !revision(snapshot.revision)
    || !Number.isFinite(Date.parse(snapshot.confirmedAt)) || Date.parse(snapshot.confirmedAt) > Date.now() + 300000
    || !snapshot.license || snapshot.license.productCode !== 'medsync' || typeof snapshot.license.active !== 'boolean') return false;
  const sub = snapshot.subscription, license = snapshot.license;
  if (sub !== null && (typeof sub !== 'object' || Array.isArray(sub))) return false;
  if (sub && (sub.organizationId !== organizationId || sub.productCode !== 'medsync' || license.active && (license.subscriptionId !== sub.id || license.planCode !== sub.planCode))) return false;
  if (!sub && license.active) return false;
  return !previousRevision || snapshot.revision.length > previousRevision.length
    || snapshot.revision.length === previousRevision.length && snapshot.revision > previousRevision;
}

export function fullRefundConfirmation(subscription, license, organizationId) {
  const proof = license && license.billing && license.billing.refundConfirmation;
  if (!proof || !subscription || license.active !== false || license.licenseStatus !== 'revoked' || license.productCode !== 'medsync'
    || subscription.status !== 'cancelled' || subscription.cancelAtPeriodEnd !== false
    || subscription.productCode !== 'medsync' || subscription.organizationId !== organizationId
    || license.subscriptionId !== subscription.id || license.planCode !== subscription.planCode
    || proof.status !== 'completed' || proof.type !== 'full_current_period' || proof.productCode !== 'medsync'
    || proof.organizationId !== organizationId || proof.subscriptionId !== subscription.id
    || !['paymentId', 'refundId'].every(key => typeof proof[key] === 'string' && proof[key].trim())
    || typeof proof.amount !== 'string' || !/^\d+\.\d{2}$/.test(proof.amount) || !/[1-9]/.test(proof.amount) || !/^[A-Z]{3}$/.test(proof.currency)
    || !Number.isFinite(Date.parse(proof.refundedAt)) || Date.parse(proof.refundedAt) > Date.now() + 300000) return null;
  return proof;
}
