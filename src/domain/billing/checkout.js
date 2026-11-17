export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function checkoutAttemptId(value) { return typeof value === 'string' && UUID_V4.test(value) ? value.toLowerCase() : ''; }
export function checkoutResumeRoute(value, operation) {
  const id = checkoutAttemptId(value);
  return id ? { name: operation === 'change_plan' ? 'accountPlanChange' : 'accountPlans', query: { attempt_id: id } } : null;
}
export function checkoutLoginRoute(value, operation) {
  const id = checkoutAttemptId(value);
  return { name: 'login', ...(id ? { query: { checkout_attempt: id, ...(operation === 'change_plan' ? { checkout_operation: 'change_plan' } : {}) } } : {}) };
}
export function checkoutLoginPath(location) {
  const operation = location && location.pathname === '/cuenta/cambiar-plan' ? 'change_plan' : undefined;
  const id = location && ['/cuenta/planes', '/cuenta/cambiar-plan'].includes(location.pathname) ? checkoutAttemptId(new URLSearchParams(location.search || '').get('attempt_id')) : '';
  return id ? '/login?checkout_attempt=' + encodeURIComponent(id) + (operation ? '&checkout_operation=change_plan' : '') : '/login';
}
export function canManageCheckout(role) { return ['admin', 'business_admin'].includes(role); }
export function safePaymentUrl(value) {
  if (typeof value !== 'string') return '';
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch (_) { return ''; }
}
export function usableOffers(catalog) {
  return Boolean(catalog && catalog.available === true && catalog.taxBehavior === 'inclusive' && Array.isArray(catalog.offers) && catalog.offers.length && catalog.offers.every(plan => plan && typeof plan.code === 'string' && typeof plan.name === 'string' && Array.isArray(plan.prices) && plan.prices.length && plan.prices.every(price => price && typeof price.code === 'string' && /^\d+\.\d{2}$/.test(price.amount) && typeof price.currency === 'string' && ['month', 'year'].includes(price.billingInterval) && Number.isInteger(price.billingIntervalCount) && price.billingIntervalCount > 0)));
}
export function selectedOffer(catalog, planCode, priceCode) {
  if (!usableOffers(catalog)) return null;
  const plan = catalog.offers.find(item => item.code === planCode);
  const price = plan && plan.prices.find(item => item.code === priceCode);
  return plan && price ? { planCode: plan.code, planPriceCode: price.code, name: plan.name, price: { ...price } } : null;
}
export function legalDocuments(prepared, now = Date.now()) {
  if (!prepared || typeof prepared.requestId !== 'string' || !Number.isFinite(Date.parse(prepared.expiresAt)) || Date.parse(prepared.expiresAt) <= now || !Array.isArray(prepared.documents) || !prepared.documents.length || prepared.documents.length > 20) return [];
  const documents = prepared.documents.map(doc => {
    if (!doc || typeof doc.documentVersionId !== 'string' || !doc.documentVersionId || typeof doc.contentHash !== 'string' || !doc.contentHash || typeof doc.title !== 'string' || !doc.title || typeof doc.contentHtml !== 'string' || !doc.contentHtml.trim() || !['accept', 'acknowledge', 'consent'].includes(doc.requiredAction) || typeof doc.acceptedInRegistration !== 'boolean' || doc.acceptedInRegistration && !Number.isFinite(Date.parse(doc.acceptedAt))) return null;
    return { documentVersionId: doc.documentVersionId, contentHash: doc.contentHash, title: doc.title, version: doc.version, kind: doc.kind, contentHtml: doc.contentHtml, requiredAction: doc.requiredAction, acceptedInRegistration: doc.acceptedInRegistration, acceptedAt: doc.acceptedAt };
  });
  return documents.every(Boolean) && new Set(documents.map(doc => doc.documentVersionId)).size === documents.length ? documents : [];
}
export function usableAttempt(value, id) {
  return Boolean(checkoutAttemptId(id) && value && checkoutAttemptId(value.attemptId) === checkoutAttemptId(id) && ['pending', 'processing', 'ready', 'rejected'].includes(value.status) && typeof value.statusFresh === 'boolean');
}
export function checkoutConfirmation(license) {
  const proof = license && license.billing && license.billing.checkoutConfirmation;
  if (!proof || proof.status !== 'completed' || proof.provider !== 'paypal' || proof.productCode !== 'medsync'
    || !['organizationId', 'subscriptionId', 'paymentId', 'userId', 'planCode', 'planPriceCode'].every(key => typeof proof[key] === 'string' && proof[key])
    || !/^\d+\.\d{2}$/.test(proof.paidAmount) || Number(proof.paidAmount) <= 0 || !/^\d+\.\d{2}$/.test(proof.recurringAmount) || Number(proof.recurringAmount) <= 0
    || !/^[A-Z]{3}$/.test(proof.currency) || !['month', 'year'].includes(proof.billingInterval) || !Number.isInteger(proof.billingIntervalCount) || proof.billingIntervalCount < 1
    || !Number.isFinite(Date.parse(proof.paidAt)) || proof.nextBillingAt !== null && !Number.isFinite(Date.parse(proof.nextBillingAt))) return null;
  return proof;
}
export function paymentConfirmed(attempt, subscription, license, now = Date.now(), buyer = {}) {
  const proof = checkoutConfirmation(license);
  return Boolean(proof && attempt && attempt.status === 'ready' && attempt.abandoned !== true && attempt.subscriptionId && attempt.planCode && attempt.planPriceCode
    && subscription && subscription.id === attempt.subscriptionId && subscription.planCode === attempt.planCode && subscription.planPriceCode === attempt.planPriceCode && subscription.status === 'active' && subscription.productCode === 'medsync'
    && license && license.active === true && license.productCode === 'medsync' && license.licenseStatus === 'active' && license.subscriptionId === attempt.subscriptionId && license.planCode === attempt.planCode
    && proof.subscriptionId === attempt.subscriptionId && proof.planCode === attempt.planCode && proof.planPriceCode === attempt.planPriceCode && proof.organizationId === subscription.organizationId
    && (!buyer.organizationId || proof.organizationId === buyer.organizationId) && (!buyer.userId || proof.userId === buyer.userId)
    && (license.validUntil === null || Number.isFinite(Date.parse(license.validUntil)) && Date.parse(license.validUntil) > now));
}
export function paidSessionApplied(business, license, tenant, now = Date.now()) {
  if (!business || !license || !tenant || tenant.allowed !== true) return false;
  const expected = { medsync_basic: 'basic', medsync_pro: 'pro', medsync_clinic: 'enterprise' }[license.planCode];
  const managed = business.billingManaged !== undefined ? business.billingManaged : business.billing_managed;
  const accessUntil = business.billingAccessUntil || business.billing_access_until;
  return Boolean(expected && (managed === true || managed === 1)
    && (business.subscriptionStatus || business.subscription_status) === 'active'
    && business.plan === expected && Number.isFinite(Date.parse(accessUntil)) && Date.parse(accessUntil) > now);
}
export function paymentErrorMessage(error) {
  const messages = {
    TRIAL_NOT_AVAILABLE: 'El estado actual de la cuenta ya no permite continuar con esta prueba. Consulta el estado de tu cuenta para conocer las opciones disponibles.',
    ACTIVATION_UNAVAILABLE: 'No pudimos confirmar el siguiente paso de tu cuenta. Vuelve a consultar antes de continuar.',
    BILLING_UNAVAILABLE: 'El servicio de pagos no está disponible por el momento. Conserva este intento y consulta de nuevo más tarde.',
    PAYMENTS_FORBIDDEN: 'Esta cuenta no puede contratar un plan para el consultorio actual.',
    PAYMENT_LEGAL_ACCEPTANCE_REQUIRED: 'Revisa y acepta las condiciones de contratación antes de preparar el pago.',
    PAYMENT_CONFLICT: 'Los documentos o la solicitud cambiaron. Revisa nuevamente las condiciones; si ya se inició el pago, consulta el mismo intento.',
    PAYMENT_NOT_FOUND: 'No encontramos este intento para el consultorio actual. Vuelve a consultar; no iniciaremos otro pago automáticamente.',
    INVALID_PAYMENT_REQUEST: 'No pudimos validar la solicitud de pago. Consulta los planes y revisa las condiciones antes de continuar.',
    LEGAL_UNAVAILABLE: 'Los documentos de contratación no están disponibles. Vuelve a consultarlos antes de continuar.',
    AUTH_CONTEXT_CHANGED: 'La sesión o el consultorio cambiaron. Vuelve a consultar desde la cuenta actual.',
    AUTH_REQUIRED: 'Tu sesión terminó. Inicia sesión para retomar este intento.',
    CONTACT_VERIFICATION_REQUIRED: 'Verifica tu correo antes de contratar un plan.',
    BILLING_PROVIDER_PRICE_NOT_CONFIGURED: 'Este precio todavía no está configurado para la conexión de pago. Consulta otro precio o vuelve a intentarlo más tarde.',
    BILLING_PROVIDER_PRICE_SCOPE_CONFLICT: 'La conexión de pago cambió. Actualiza los planes antes de comenzar otro intento.',
    CHECKOUT_IN_PROGRESS: 'Ya hay un intento en proceso. Consulta su estado antes de iniciar otro.',
    PLAN_CHANGE_ALREADY_AUTHORIZED: 'Este cambio ya recibió una autorización en PayPal. Consulta su estado antes de elegir otro plan.',
    PLAN_CHANGE_UNAVAILABLE: 'Necesitas una suscripción activa con renovación vigente para cambiar de plan.',
    LEGAL_REQUIRED: 'Revisa y acepta las condiciones de contratación para continuar.',
    LEGAL_VERSION_CHANGED: 'Los documentos cambiaron. Vuelve a preparar las condiciones y revisa las nuevas versiones.',
    LEGAL_ACCEPTANCE_INVALID: 'No pudimos validar la aceptación. Vuelve a consultar las condiciones.',
    CSRF_FORBIDDEN: 'No se pudo validar la solicitud segura. Vuelve a consultar el estado antes de reintentar.',
    IDEMPOTENCY_CONFLICT: 'Esta clave pertenece a una solicitud anterior. Conserva el intento y consulta su estado.'
  };
  if (error && messages[error.code]) return messages[error.code];
  if (error && error.status === 401) return messages.AUTH_REQUIRED;
  if (error && error.status === 403) return 'No tienes permiso para contratar un plan desde esta cuenta.';
  if (error && error.status === 404) return 'No encontramos este intento para el consultorio actual. Vuelve a consultar; no iniciaremos otro pago automáticamente.';
  if (error && error.status === 409) return 'La solicitud está en proceso o cambió su configuración. Consulta el mismo intento antes de reintentar.';
  if (error && error.status === 429) return 'Has realizado varios intentos. Espera el tiempo indicado antes de consultar de nuevo.';
  return 'No pudimos confirmar el resultado. Consulta el estado de este mismo intento antes de reintentar.';
}
