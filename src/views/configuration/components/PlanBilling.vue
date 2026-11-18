<template>
  <section class="plan-billing" :class="{ 'plan-billing--unsubscribed': refund }" aria-label="Suscripción del consultorio" :aria-busy="loading || changingPlan ? 'true' : 'false'">
    <p v-if="loading" class="billing-message text-gray-600" role="status">Consultando tu suscripción…</p>
    <div v-else-if="error" class="billing-message billing-error" role="alert">
      <p>No pudimos consultar los detalles de tu suscripción. Vuelve a intentarlo para ver la información actualizada.</p>
      <button type="button" class="billing-link" @click="load">Reintentar consulta</button>
    </div>

    <div v-else class="billing-content">
      <article class="current-plan" aria-labelledby="current-plan-title">
        <div class="billing-overview">
          <div class="billing-plan-name">
            <p v-if="!refund && hasSubscriptionOrTrial" class="billing-eyebrow">Tu plan actual</p>
            <div class="billing-title-row">
              <h2 id="current-plan-title">{{ planName }}</h2>
              <span v-if="!refund && hasSubscriptionOrTrial" class="billing-status" :class="{ 'billing-status--attention': needsAttention }">{{ statusLabel }}</span>
            </div>
            <p class="billing-clinic">{{ business.name || 'Tu consultorio' }}</p>
          </div>
          <div v-if="!refund && !cancellationScheduled && hasSubscriptionOrTrial" class="billing-price">
            <template v-if="isTrial"><strong>Periodo de prueba</strong><span>Explora las funciones antes de contratar.</span></template>
            <template v-else-if="currentPrice"><strong>{{ money(currentPrice.recurringAmount, currentPrice.currency) }}</strong><span>{{ periodLabel }} · {{ currentPrice.currency }}</span></template>
            <template v-else><strong>Importe por confirmar</strong><span>Consulta las condiciones de tu contratación con MedSync.</span></template>
          </div>
        </div>
        <dl v-if="!refund && !cancellationScheduled && hasSubscriptionOrTrial" class="billing-details">
          <div><dt>{{ isTrial ? 'Fin de la prueba' : cancellationPending ? 'Periodo pagado hasta' : renewalStopped ? 'Acceso hasta' : 'Próxima renovación' }}</dt><dd>{{ dateLabel(periodEnd) }}</dd></div>
          <div><dt>{{ isTrial ? 'Contratación' : 'Forma de pago' }}</dt><dd>{{ isTrial ? 'Sin cobros durante la prueba' : paymentMethod }}</dd></div>
        </dl>
        <template v-if="refund">
          <p class="billing-no-plan-copy">Elige un plan para activar las funciones de tu consultorio.</p>
          <p class="billing-refund-note" role="status"><v-icon size="16" aria-hidden="true">mdi-check-circle-outline</v-icon>Tu devolución total fue confirmada.</p>
        </template>
        <div v-else-if="cancellationPending" class="billing-notice" role="status">
          <strong>Solicitud recibida · Pendiente de confirmación</strong>
          <p>Estamos procesando la cancelación de la renovación. {{ paidAccessUntil ? 'Tu periodo pagado sigue disponible hasta el ' + dateTimeLabel(paidAccessUntil) + '.' : 'Consulta el estado para confirmar la fecha de acceso.' }}</p>
          <button type="button" class="billing-link" @click="load">Consultar estado</button>
        </div>
        <div v-else-if="cancellationScheduled" class="billing-notice billing-access-notice" role="status">
          <template v-if="paidAccessUntil">
            <strong>Puedes seguir usando tu plan</strong>
            <p class="billing-access-date">Hasta el {{ dateTimeLabel(paidAccessUntil) }}</p>
            <p>La renovación automática ya está cancelada. No necesitas hacer nada más para cancelarla. Al terminar este periodo, finalizará el acceso a las funciones de tu plan.</p>
          </template>
          <template v-else>
            <strong>La renovación automática está cancelada</strong>
            <p>Consulta el estado de tu acceso. No pudimos confirmar un periodo de acceso vigente.</p>
            <button type="button" class="billing-link" @click="load">Consultar estado</button>
          </template>
        </div>
        <div v-if="!refund" class="billing-plan-footer">
          <router-link v-if="isTrial && !subscription" :to="{ name: 'accountPlans' }" class="billing-button billing-button--primary">Elegir un plan <span aria-hidden="true">→</span></router-link>
          <button v-else type="button" class="billing-button" :class="cancellationScheduled ? 'billing-button--outline' : 'billing-button--primary'" @click="showPlans = true">{{ cancellationScheduled ? 'Ver planes disponibles' : 'Comparar planes' }} <span aria-hidden="true">→</span></button>
        </div>
      </article>

      <section v-if="refund" class="billing-available-plans" aria-labelledby="billing-available-title">
        <h2 id="billing-available-title">Planes disponibles</h2>
        <plan-catalog v-if="catalog && catalog.available" embedded selectable :catalog-data="catalog" :selected-price-code="selectedPlan && selectedPlan.planPriceCode || ''" :disabled="!catalog.checkoutAvailable" @select="selectPlan" />
        <div v-else class="billing-catalog-error" role="status">
          <p>No pudimos consultar los planes disponibles.</p>
          <button type="button" class="billing-link" @click="load">Volver a consultar planes</button>
        </div>
        <p v-if="catalog && catalog.available && !catalog.checkoutAvailable" class="billing-catalog-message" role="status">La contratación no está disponible por el momento. Vuelve a intentarlo más tarde.</p>
      </section>

      <section v-if="protectedChange" class="billing-notice billing-access-notice" aria-labelledby="billing-change-title">
        <strong id="billing-change-title">{{ pendingChange.state === 'scheduled' ? 'Cambio de plan programado' : 'Tienes un cambio de plan en curso' }}</strong>
        <p>{{ pendingChange.state === 'scheduled' ? 'El cambio está previsto para el ' + dateTimeLabel(pendingChange.effectiveAt) + '. Conservas tu plan actual hasta entonces.' : 'Continúa con la misma solicitud para revisar y confirmar el cambio en PayPal.' }}</p>
        <button type="button" class="billing-link" @click="resumePlanChange">{{ pendingChange.state === 'scheduled' ? 'Ver cambio de plan' : 'Continuar cambio de plan' }}</button>
      </section>

      <footer v-if="!refund && !cancellationScheduled && hasSubscriptionOrTrial" class="billing-management">
        <div>
          <h2>Administrar suscripción</h2>
          <p v-if="cancellationError && !showCancellation" class="billing-cancellation-error" role="alert">{{ cancellationError }}</p>
          <p v-else-if="isTrial">No necesitas cancelar tu prueba: no tiene cobros automáticos.</p>
          <p v-else-if="renewalStopped">Consulta arriba el estado de tu cancelación y el periodo pagado.</p>
          <p v-else-if="canCancel">Puedes cancelar la renovación y conservar el acceso hasta terminar el periodo pagado.</p>
          <p v-else class="billing-footnote">No hay un periodo pagado vigente confirmado para cancelar la renovación.</p>
        </div>
        <v-btn v-if="canCancel" text color="error" :loading="preparingCancellation" :disabled="cancelling" @click="prepareCancellation">Cancelar renovación</v-btn>
      </footer>
    </div>

    <section v-if="canViewHistory" class="billing-payments" aria-labelledby="billing-payment-title" :aria-busy="historyLoading ? 'true' : 'false'">
      <h2 id="billing-payment-title">Pagos y comprobantes</h2>
      <ol v-if="paymentHistory.length" class="billing-payment-list">
        <li v-for="payment in paymentHistory" :key="payment.id" class="billing-payment-row">
          <div class="billing-payment-copy">
            <p class="billing-payment-description">{{ payment.description || 'Pago de tu suscripción' }}</p>
            <p>{{ payment.paidAt ? 'Pagado el ' : 'Registrado el ' }}{{ dateLabel(payment.paidAt || payment.createdAt) }} · PayPal</p>
            <p v-if="payment.reference" class="billing-payment-reference">Referencia: {{ payment.reference }}</p>
          </div>
          <div class="billing-payment-total">
            <p class="billing-payment-amount">{{ money(payment.amount, payment.currency) }} <small>{{ payment.currency }}</small></p>
            <p class="billing-payment-status">{{ paymentStatusLabel(payment.status) }}</p>
            <p v-if="payment.refundedAmount" class="billing-payment-refunded">Devuelto: {{ money(payment.refundedAmount, payment.currency) }} {{ payment.currency }}</p>
          </div>
        </li>
      </ol>
      <p v-if="historyLoading" class="billing-footnote" role="status">Consultando {{ paymentHistory.length ? 'más pagos' : 'tus pagos' }}…</p>
      <div v-if="historyError" class="billing-history-error" role="alert">
        <p>No pudimos consultar {{ historyRetryMore ? 'más pagos' : 'el historial de pagos' }}. Tu suscripción sigue disponible arriba.</p>
        <button type="button" class="billing-link" :disabled="historyLoading" @click="loadHistory(historyRetryMore)">Volver a consultar pagos</button>
      </div>
      <p v-else-if="historyLoaded && !historyLoading && !paymentHistory.length" class="billing-footnote">{{ isTrial ? 'Tu prueba no genera cargos. ' : '' }}Todavía no hay pagos confirmados. Aparecerán aquí cuando PayPal confirme su recepción.</p>
      <button v-if="historyNextCursor && !historyError" type="button" class="billing-button billing-history-more" :disabled="historyLoading" @click="loadHistory(true)">Ver más pagos</button>
      <p v-if="paymentHistory.length" class="billing-footnote billing-payment-receipt">Consulta el comprobante de cada pago en tu cuenta de PayPal.</p>
    </section>

    <v-dialog content-class="admin-settings-dialog plan-compare-dialog" v-model="showPlans" :persistent="changingPlan" max-width="980" scrollable aria-labelledby="billing-plans-title" aria-describedby="billing-plans-description">
      <v-card class="billing-dialog plan-compare-card">
        <v-card-title class="plan-compare-heading">
          <div><p class="plan-compare-eyebrow">Planes de MedSync</p><h2 id="billing-plans-title">Compara y encuentra tu plan</h2><p id="billing-plans-description">Precios y funciones para elegir lo que necesita tu consultorio.</p></div>
          <button type="button" class="plan-compare-close" aria-label="Cerrar comparación" :disabled="changingPlan" @click="showPlans = false"><v-icon aria-hidden="true">mdi-close</v-icon></button>
        </v-card-title>
        <v-card-text class="plan-compare-body">
          <plan-catalog v-if="showPlans" embedded :selectable="!protectedChange" :catalog-data="catalog" :current-plan-code="!refund && subscription && subscription.planCode || ''" :selected-price-code="protectedChange ? protectedChange.targetPlanPriceCode : selectedPlan && selectedPlan.planPriceCode || ''" :disabled="!catalog || !catalog.checkoutAvailable || changingPlan" @select="selectPlan" />
        </v-card-text>
        <v-card-actions class="plan-compare-footer">
          <template v-if="protectedChange">
            <p role="status">{{ pendingChange.state === 'scheduled' ? 'Tu cambio ya está programado. Puedes consultar la misma solicitud.' : 'Este cambio ya fue autorizado. Consulta la misma solicitud para continuar.' }}</p>
            <v-btn depressed color="primary" :disabled="!canResumePlanChange" @click="resumePlanChange">{{ pendingChange.state === 'scheduled' ? 'Ver cambio programado' : 'Continuar cambio de plan' }}<v-icon right size="18">mdi-arrow-right</v-icon></v-btn>
          </template>
          <template v-else>
            <p v-if="selectedPlan" role="status">{{ selectedPlan.name }} · {{ money(selectedPlan.price.amount, selectedPlan.price.currency) }} {{ selectedPlan.price.currency }}</p>
            <p v-else>{{ catalog && catalog.checkoutAvailable ? 'Selecciona el plan al que quieres cambiar.' : 'La selección de planes no está disponible por el momento.' }}</p>
            <p v-if="subscription && !refund && !canChangePlan" role="status">Necesitas una suscripción activa con renovación vigente para cambiar de plan.</p>
            <v-btn depressed color="primary" :disabled="changingPlan || !selectedPlan || !catalog || !catalog.checkoutAvailable || (subscription && !refund && !canChangePlan)" :loading="changingPlan" @click="continueWithPlan">{{ isTrial && !subscription ? 'Continuar con el plan' : 'Revisar cambio de plan' }}<v-icon right size="18">mdi-arrow-right</v-icon></v-btn>
          </template>
          <p v-if="planChangeError" class="billing-cancellation-error" role="alert">{{ planChangeError }}<v-btn v-if="blockedPlanChangeId" text :disabled="changingPlan" @click="openBlockedPlanChange">Consultar cambio actual</v-btn></p>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog content-class="admin-settings-dialog billing-cancel-dialog" v-model="showCancellation" :persistent="cancelling" max-width="580" scrollable aria-labelledby="billing-cancel-title" aria-describedby="billing-cancel-description">
      <v-card v-if="cancellationSucceeded" class="billing-dialog billing-cancel-card">
        <v-card-text class="billing-cancel-success" role="status" aria-live="polite">
          <svg class="billing-success-mark" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <circle class="billing-success-ring" cx="40" cy="40" r="29" pathLength="1" />
            <path class="billing-success-check" d="M26 40l10 10 19-21" pathLength="1" />
          </svg>
          <h2 id="billing-cancel-title">Renovación cancelada</h2>
          <p id="billing-cancel-description">La renovación automática de <strong>{{ planName }}</strong> para <strong>{{ business.name || 'tu consultorio' }}</strong> quedó cancelada.</p>
          <p v-if="paidAccessUntil" class="billing-success-access">Conservas el acceso hasta el <strong>{{ dateTimeLabel(paidAccessUntil) }}</strong>.</p>
        </v-card-text>
        <v-card-actions class="billing-dialog-actions billing-cancel-actions">
          <v-btn ref="cancellationDone" depressed color="primary" @click="showCancellation = false">Entendido</v-btn>
        </v-card-actions>
      </v-card>
      <v-card v-else class="billing-dialog billing-cancel-card">
        <v-card-title class="billing-cancel-heading">
          <span class="billing-cancel-icon"><v-icon size="24" aria-hidden="true">mdi-calendar-refresh</v-icon></span>
          <div class="billing-cancel-heading-copy">
            <h2 id="billing-cancel-title">Cancelar renovación</h2>
          </div>
          <button type="button" class="billing-cancel-close" aria-label="Cerrar cancelación" :disabled="cancelling || preparingCancellation" @click="showCancellation = false"><v-icon size="20" aria-hidden="true">mdi-close</v-icon></button>
        </v-card-title>
        <v-card-text class="billing-cancel-body">
          <p id="billing-cancel-description" class="billing-cancel-intro">Estás por cancelar la renovación de <strong>{{ planName }}</strong> para <strong>{{ business.name || 'tu consultorio' }}</strong>.</p>
          <div class="billing-cancel-access">
            <v-icon size="22" aria-hidden="true">mdi-calendar-check-outline</v-icon>
            <div>
              <p>Conservas el acceso hasta el</p>
              <strong>{{ dateTimeLabel(cancellationAccessUntil) }}</strong>
              <span>Sigue usando las funciones de tu plan durante el periodo pagado.</span>
            </div>
          </div>
          <div class="billing-cancel-effects">
            <h3>¿Qué pasa después?</h3>
            <p>Al terminar el periodo pagado, finaliza el acceso a las funciones de tu plan.</p>
            <p>Esta acción no solicita un reembolso.</p>
          </div>
          <p v-if="cancellationError" class="billing-cancellation-error billing-cancel-feedback" role="alert">{{ cancellationError }}</p>
          <p v-if="cancelling" class="billing-cancel-progress" role="status">Enviando la solicitud y consultando su estado…</p>
        </v-card-text>
        <v-card-actions class="billing-dialog-actions billing-cancel-actions">
          <v-btn outlined color="primary" :disabled="cancelling || preparingCancellation" @click="showCancellation = false">{{ cancellationNeedsRefresh ? 'Cerrar' : 'Conservar plan' }}</v-btn>
          <v-btn v-if="cancellationNeedsRefresh" depressed color="primary" :loading="preparingCancellation" @click="prepareCancellation">Consultar estado</v-btn>
          <v-btn v-else depressed color="error" :loading="cancelling" :disabled="preparingCancellation || !canCancel" @click="confirmCancellation">Confirmar cancelación</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import Payments from '../../../services/core/billing/DAPaymentsService';
import PlanCatalog from '../../../components/billing/PlanCatalog.vue';
import { registrationAttemptId } from '../../../utils/registration';
import { paidCancellationEnd, cancellationIntentKey, savedCancellationIntent, saveCancellationIntent } from '../../../domain/billing/cancellation';
import { registerSettingsNavigationGuard } from '../../../domain/settings/settings.navigation';
import { newerSubscriptionSnapshot, fullRefundConfirmation } from '../../../domain/billing/subscriptionUpdates';
import { checkoutAttemptId, checkoutConfirmation, selectedOffer } from '../../../domain/billing/checkout';
import { isTenantAdministrator } from '../../../security/settingsAccess';
import { authorizationContext, isCurrentAuthorization } from '../../../security/authorizationContext';
import { paymentHistoryPage, paymentStatusLabel } from '../../../domain/billing/paymentHistory';
import { planChangeOwner, rememberPlanChangeDiscard, forgetPlanChangeDiscard } from '../../../domain/billing/planChange';

const statuses = { trial: 'En prueba', trialing: 'En prueba', active: 'Activa', pending: 'Pendiente', past_due: 'Pago pendiente', suspended: 'Suspendida', cancelled: 'Cancelada', canceled: 'Cancelada', expired: 'Vencida', inactive: 'Inactiva', unpaid: 'Pago pendiente' };
export default {
  components: { PlanCatalog },
  data: () => ({ paymentHistory: [], historyLoading: false, historyLoaded: false, historyError: false, historyNextCursor: null, historyRetryMore: false, loading: true, error: false, subscription: null, license: null, catalog: null, snapshotRevision: '', selectedPlan: null, showPlans: false, changingPlan: false, planChangeError: '', blockedPlanChangeId: '', showCancellation: false, preparingCancellation: false, cancelling: false, cancellationIntent: null, cancellationAccessUntil: null, cancellationError: '', cancellationNeedsRefresh: false, cancellationSucceeded: false }),
  computed: {
    canViewHistory() { return isTenantAdministrator(this.role); },
    business() { return this.$store.getters['CORE/AUTH/getBusiness'] || {}; },
    role() { return this.$store.getters['CORE/AUTH/getRole']; },
    // Equivalent session responses must not trigger another billing fetch.
    authContext() { return JSON.stringify(authorizationContext(this.$store)); },
    streamCredential() { const auth = this.$store.state.CORE.AUTH; return JSON.stringify([auth.accessExpiresAt, auth.token]); },
    refund() { return fullRefundConfirmation(this.subscription, this.license, this.business.id_business); },
    status() {
      if (this.subscription) return this.subscription.status;
      const localStatus = this.business.subscriptionStatus || this.business.subscription_status;
      return ['trial', 'trialing'].includes(localStatus) ? localStatus : '';
    },
    isTrial() { return ['trial', 'trialing'].includes(this.status); },
    hasSubscriptionOrTrial() { return Boolean(this.subscription) || this.isTrial; },
    cancellationPending() { return Boolean(this.subscription && this.subscription.cancellation && this.subscription.cancellation.state === 'pending'); },
    cancellationScheduled() { return Boolean(this.subscription && this.subscription.cancelAtPeriodEnd) && !this.cancellationPending; },
    paidAccessUntil() { return paidCancellationEnd(this.subscription, this.license); },
    pendingChange() { const change = this.subscription && this.subscription.pendingPlanChange; return change && ['preparing', 'awaiting_approval', 'scheduled'].includes(change.state) ? change : null; },
    canResumePlanChange() { return Boolean(this.pendingChange && isTenantAdministrator(this.role)); },
    draftChange() { return this.pendingChange && ['preparing', 'awaiting_approval'].includes(this.pendingChange.state) && this.pendingChange.action !== 'approve_payment' ? this.pendingChange : null; },
    protectedChange() { return this.pendingChange && !this.draftChange ? this.pendingChange : null; },
    canChangePlan() { return isTenantAdministrator(this.role) && this.subscription && this.status === 'active' && !this.renewalStopped && !this.protectedChange; },
    canCancel() { return isTenantAdministrator(this.role) && !this.renewalStopped && ['active', 'past_due'].includes(this.status) && Boolean(this.paidAccessUntil); },
    renewalStopped() { return this.cancellationScheduled || Boolean(this.subscription && (this.subscription.cancellation || this.subscription.cancelledAt)) || ['cancelled', 'canceled'].includes(this.status); },
    statusLabel() { return this.refund ? 'Devolución total confirmada' : this.cancellationPending ? 'Cancelación pendiente' : this.cancellationScheduled ? 'Renovación cancelada' : statuses[this.status] || 'Estado por confirmar'; },
    needsAttention() { return this.cancellationPending || (this.cancellationScheduled ? !this.paidAccessUntil : !['active', 'trial', 'trialing'].includes(this.status)); },
    planName() {
      if (this.refund) return 'Sin plan activo';
      if (!this.hasSubscriptionOrTrial) return 'Sin suscripción registrada en Billing';
      const offers = this.catalog && this.catalog.available && this.catalog.offers;
      const plan = Array.isArray(offers) && offers.find(plan => plan.code === (this.subscription && this.subscription.planCode));
      return plan && typeof plan.name === 'string' && plan.name.trim() || 'Plan del consultorio';
    },
    purchase() {
      const proof = checkoutConfirmation(this.license), sub = this.subscription;
      return proof && sub && proof.organizationId === this.business.id_business && proof.subscriptionId === sub.id && proof.planCode === sub.planCode && proof.planPriceCode === sub.planPriceCode ? proof : null;
    },
    paymentMethod() {
      // MedSync subscriptions use PayPal; changing plans does not require a new initial-checkout receipt.
      const sub = this.subscription;
      return this.purchase || sub && sub.productCode === 'medsync' && sub.organizationId === this.business.id_business ? 'PayPal' : 'Consultar con MedSync';
    },
    currentPrice() {
      const sub = this.subscription, license = this.license, billing = license && license.billing;
      if (sub && sub.organizationId === this.business.id_business && sub.productCode === 'medsync' && license && license.productCode === 'medsync'
        && license.subscriptionId === sub.id && license.planCode === sub.planCode && billing && /^[A-Z]{3}$/.test(billing.currency)
        && typeof billing.totalMonthly === 'string' && /^\d+\.\d{2}$/.test(billing.totalMonthly) && Number(billing.totalMonthly) > 0) {
        const offer = selectedOffer(this.catalog, sub.planCode, sub.planPriceCode);
        return { recurringAmount: billing.totalMonthly, currency: billing.currency,
          billingInterval: offer && offer.price.currency === billing.currency ? offer.price.billingInterval : null,
          billingIntervalCount: offer && offer.price.currency === billing.currency ? offer.price.billingIntervalCount : null };
      }
      return this.purchase;
    },
    periodEnd() {
      if (this.isTrial) return this.business.trialEndsAt || this.business.trial_ends_at;
      const sub = this.subscription;
      if (!sub) return null;
      if (this.renewalStopped) return sub.currentPeriodEnd || this.license && this.license.validUntil;
      return ['active', 'past_due'].includes(this.status) ? sub.nextBillingTime : null;
    },
    periodLabel() {
      if (!this.currentPrice) return '';
      if (!this.currentPrice.billingInterval) return 'por periodo';
      const count = this.currentPrice.billingIntervalCount, yearly = this.currentPrice.billingInterval === 'year';
      return count === 1 ? yearly ? 'al año' : 'al mes' : 'cada ' + count + (yearly ? ' años' : ' meses');
    }
  },
  watch: {
    showPlans(open) { if (!open) this.selectedPlan = null; },
    showCancellation(open) { if (!open) this.cancellationSucceeded = false; },
    cancellationSucceeded(success) {
      if (success) this.$nextTick(() => {
        if (this.showCancellation && this.cancellationSucceeded && this.$refs.cancellationDone) this.$refs.cancellationDone.$el.focus();
      });
    },
    streamCredential() { this.startSubscriptionUpdates(); },
    authContext() {
      this.stopSubscriptionUpdates(); this.snapshotRevision = ''; this.resetHistory();
      if (this.cancellationController) this.cancellationController.abort();
      if (this.discardController) this.discardController.abort(); this.discardController = null; this.changingPlan = false; this.planChangeError = ''; this.blockedPlanChangeId = '';
      this.showPlans = false; this.showCancellation = false; this.cancelling = false; this.preparingCancellation = false;
      this.cancellationIntent = null; this.cancellationError = ''; this.cancellationNeedsRefresh = false; this.load().finally(() => this.startSubscriptionUpdates());
    }
  },
  created() {
    if (this.$router) this.removeNavigationGuard = registerSettingsNavigationGuard(this, { isSaving: () => this.cancelling || this.changingPlan });
    this.load().finally(() => this.startSubscriptionUpdates());
  },
  beforeDestroy() {
    this.stopSubscriptionUpdates();
    if (this.controller) this.controller.abort();
    if (this.historyController) this.historyController.abort();
    if (this.cancellationController) this.cancellationController.abort();
    if (this.discardController) this.discardController.abort();
    if (this.removeNavigationGuard) this.removeNavigationGuard();
  },
  methods: {
    paymentStatusLabel,
    resetHistory() {
      if (this.historyController) this.historyController.abort();
      this.historyController = null; this.paymentHistory = []; this.historyNextCursor = null;
      this.historyLoading = false; this.historyLoaded = false; this.historyError = false; this.historyRetryMore = false;
    },
    async loadHistory(more = false) {
      if (!this.canViewHistory || this._isDestroyed) return;
      if (more && (this.historyLoading || !this.historyNextCursor)) return;
      if (this.historyController) this.historyController.abort();
      const controller = new AbortController(), owner = authorizationContext(this.$store);
      const cursor = more ? this.historyNextCursor : undefined;
      this.historyController = controller; this.historyLoading = true; this.historyError = false; this.historyRetryMore = more;
      const current = () => this.historyController === controller && !controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store) && this.canViewHistory;
      try {
        const page = paymentHistoryPage(await Payments.history(cursor, controller.signal), this.business.id_business);
        if (!current()) return;
        if (!page || page.nextCursor && page.nextCursor === cursor) throw new Error('INVALID_HISTORY');
        const items = more ? [...this.paymentHistory, ...page.items] : page.items;
        this.paymentHistory = items.filter((item, index) => items.findIndex(other => other.id === item.id) === index);
        this.historyNextCursor = page.nextCursor; this.historyLoaded = true;
      } catch (_) { if (current()) this.historyError = true; }
      finally { if (current()) { this.historyLoading = false; this.historyController = null; } }
    },
    startSubscriptionUpdates() {
      this.stopSubscriptionUpdates();
      if (this._isDestroyed || !isTenantAdministrator(this.role)) return;
      const owner = authorizationContext(this.$store);
      this.closeSubscriptionUpdates = Payments.watchSubscription({ updated: snapshot => {
        if (!this._isDestroyed && isCurrentAuthorization(owner, this.$store)) this.applySubscriptionSnapshot(snapshot);
      } });
    },
    stopSubscriptionUpdates() {
      if (this.closeSubscriptionUpdates) this.closeSubscriptionUpdates();
      this.closeSubscriptionUpdates = null;
    },
    applySubscriptionSnapshot(snapshot) {
      if (!newerSubscriptionSnapshot(snapshot, this.business.id_business, this.snapshotRevision)) return;
      this.snapshotRevision = snapshot.revision;
      this.loadHistory();
      this.subscription = snapshot.subscription; this.license = snapshot.license; this.loading = false; this.error = false;
      if (!this.refund) return;
      if (this.cancellationController) this.cancellationController.abort();
      if (this.discardController) this.discardController.abort(); this.discardController = null; this.changingPlan = false; this.planChangeError = ''; this.blockedPlanChangeId = '';
      this.showPlans = false; this.selectedPlan = null; this.showCancellation = false; this.cancelling = false; this.preparingCancellation = false;
      this.cancellationIntent = null; this.cancellationError = ''; this.cancellationNeedsRefresh = false;
      this.$store.commit('CORE/AUTH/SET_AUTH_BUSINESS', { ...this.business, plan: null, subscriptionStatus: 'cancelled', billingFeatures: {} });
      this.$store.commit('CORE/AUTH/SET_AUTH_TENANT_OPERATIONAL', { allowed: false, code: 'TENANT_NOT_OPERATIONAL', reasonCode: 'TENANT_CANCELLED', tenantStatus: 'cancelled' });
    },
    selectPlan({ plan, price }) {
      if (this.protectedChange || this.changingPlan || !isTenantAdministrator(this.role) || !this.catalog || !this.catalog.checkoutAvailable || !plan || !price || !this.refund && this.subscription && plan.code === this.subscription.planCode) return;
      this.selectedPlan = selectedOffer(this.catalog, plan.code, price.code);
      if (this.refund) this.continueWithPlan();
    },
    async continueWithPlan() {
      if (!isTenantAdministrator(this.role) || this.loading || this.changingPlan) return;
      if (this.protectedChange) return this.resumePlanChange();
      if (!this.selectedPlan || !this.catalog || this.catalog.checkoutAvailable !== true) return;
      const selected = selectedOffer(this.catalog, this.selectedPlan.planCode, this.selectedPlan.planPriceCode);
      if (!selected || !this.refund && this.subscription && selected.planCode === this.subscription.planCode) return;
      const query = { plan_code: selected.planCode, price_code: selected.planPriceCode };
      if (this.refund || this.isTrial && !this.subscription) { this.showPlans = false; return this.$router.push({ name: 'accountPlans', query }); }
      if (!this.canChangePlan) return;
      const draft = this.draftChange;
      if (!draft) { this.showPlans = false; return this.$router.push({ name: 'accountPlanChange', query }); }
      let id = checkoutAttemptId(draft.attemptId);
      const owner = authorizationContext(this.$store), discardOwner = planChangeOwner(this.$store);
      const controller = new AbortController(); this.discardController = controller; this.changingPlan = true; this.planChangeError = ''; this.blockedPlanChangeId = '';
      const current = () => !this._isDestroyed && this.discardController === controller && !controller.signal.aborted && isCurrentAuthorization(owner, this.$store) && planChangeOwner(this.$store) === discardOwner && isTenantAdministrator(this.role);
      try {
        // Organization snapshots omit the attempt ID; recover it from the current subscription.
        if (!id) {
          const subscription = await Payments.subscription(controller.signal);
          if (!current()) return;
          this.validateBilling({ subscription, license: this.license });
          this.subscription = subscription;
          if (this.protectedChange) { this.changingPlan = false; return this.resumePlanChange(); }
          if (!this.catalog || this.catalog.checkoutAvailable !== true) return;
          if (!this.canChangePlan) { this.planChangeError = 'Tu suscripción cambió. Consulta el estado actual antes de elegir otro plan.'; return; }
          if (selected.planCode === subscription.planCode) { this.showPlans = false; return; }
          if (!this.draftChange) { this.changingPlan = false; this.showPlans = false; return await this.$router.push({ name: 'accountPlanChange', query }); }
          id = checkoutAttemptId(this.draftChange.attemptId);
          if (!id) throw { code: 'INVALID_PLAN_CHANGE_RESPONSE' };
        }
        if (!rememberPlanChangeDiscard(id, discardOwner, { planCode: selected.planCode, planPriceCode: selected.planPriceCode })) { this.planChangeError = 'No pudimos guardar tu selección en esta pestaña. No se inició otro cambio; vuelve a intentarlo.'; return; }
        const result = await Payments.cancel(id, controller.signal);
        if (!current()) return;
        if (!result || typeof result.cancelled !== 'boolean') throw { code: 'INVALID_DISCARD_RESPONSE' };
        if (result.cancelled) {
          forgetPlanChangeDiscard(id);
          if (!this.catalog || this.catalog.checkoutAvailable !== true) { this.planChangeError = 'La selección de planes no está disponible por el momento. La solicitud anterior ya fue descartada.'; return; }
        }
        this.changingPlan = false; this.showPlans = false;
        return await this.$router.push(result.cancelled ? { name: 'accountPlanChange', query } : { name: 'accountPlanChange', query: { attempt_id: id, discard: '1' } });
      } catch (error) {
        if (!current()) return;
        if (error && error.code === 'PLAN_CHANGE_ALREADY_AUTHORIZED') {
          forgetPlanChangeDiscard(id); this.blockedPlanChangeId = id;
          this.planChangeError = 'Este cambio ya fue autorizado o programado. Consulta la solicitud actual para continuar; no se iniciará otro cambio.';
        } else this.planChangeError = error && error.status === 401 ? 'Tu sesión terminó. Vuelve a iniciar sesión antes de continuar. No se abrió otro cambio.' : 'No pudimos confirmar que la solicitud anterior se haya descartado. No se abrió otro cambio; consulta su estado antes de continuar.';
      } finally { if (this.discardController === controller) { this.changingPlan = false; this.discardController = null; } }
    },
    openBlockedPlanChange() {
      const id = checkoutAttemptId(this.blockedPlanChangeId);
      if (!id || this.changingPlan || !isTenantAdministrator(this.role)) return;
      this.showPlans = false; return this.$router.push({ name: 'accountPlanChange', query: { attempt_id: id } });
    },
    resumePlanChange() {
      if (!this.canResumePlanChange) return;
      const id = checkoutAttemptId(this.pendingChange.attemptId);
      this.showPlans = false;
      return this.$router.push({ name: 'accountPlanChange', query: id ? { attempt_id: id } : { plan_code: this.pendingChange.targetPlanCode, price_code: this.pendingChange.targetPlanPriceCode } });
    },
    async load() {
      if (this.cancelling || this.preparingCancellation || this.changingPlan) return;
      if (this.controller) this.controller.abort();
      const controller = new AbortController(), owner = authorizationContext(this.$store), revision = this.snapshotRevision;
      this.controller = controller; this.loading = true; this.error = false; this.subscription = null; this.license = null; this.catalog = null; this.selectedPlan = null;
      if (!isTenantAdministrator(this.role)) { this.resetHistory(); this.loading = false; this.error = true; return; }
      this.loadHistory();
      try {
        const catalogRequest = Payments.plans(controller.signal).catch(() => null).then(catalog => {
          if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) this.catalog = catalog;
        });
        const [{ subscription, license }] = await Promise.all([this.readBilling(controller), catalogRequest]);
        if (controller.signal.aborted || this._isDestroyed || !isCurrentAuthorization(owner, this.$store)) return;
        if (revision === this.snapshotRevision) { this.subscription = subscription; this.license = license; }
      } catch (_) {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store) && revision === this.snapshotRevision) this.error = true;
      } finally {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) this.loading = false;
      }
    },
    validateBilling({ subscription, license }) {
      if (subscription && (subscription.productCode !== 'medsync' || subscription.organizationId !== this.business.id_business)) throw new Error('INVALID_SUBSCRIPTION');
      if (license && license.productCode && license.productCode !== 'medsync') throw new Error('INVALID_LICENSE');
      return { subscription, license };
    },
    async readBilling(controller) {
      const [subscription, license] = await Promise.all([Payments.subscription(controller.signal), Payments.license(controller.signal)]);
      return this.validateBilling({ subscription, license });
    },
    async prepareCancellation() {
      if (this.preparingCancellation || this.cancelling || !isTenantAdministrator(this.role)) return;
      const owner = authorizationContext(this.$store), controller = new AbortController();
      this.cancellationController = controller; this.preparingCancellation = true; this.cancellationError = ''; this.cancellationSucceeded = false;
      try {
        const result = await this.readBilling(controller);
        if (controller.signal.aborted || this._isDestroyed || !isCurrentAuthorization(owner, this.$store)) return;
        this.subscription = result.subscription; this.license = result.license;
        if (!this.subscription || this.renewalStopped) {
          if (this.subscription) saveCancellationIntent(cancellationIntentKey(this.$store, this.subscription), null);
          this.cancellationIntent = null; this.cancellationNeedsRefresh = false; this.showCancellation = false; return;
        }
        if (!this.canCancel) throw new Error('NO_PAID_PERIOD');
        const sub = this.subscription, end = sub.currentPeriodEnd || sub.nextBillingTime;
        const key = cancellationIntentKey(this.$store, sub);
        const previous = this.cancellationIntent || savedCancellationIntent(key);
        this.cancellationIntent = previous && previous.expectedSubscriptionId === sub.id && Date.parse(previous.expectedPeriodEnd) === Date.parse(end)
          ? previous : { idempotencyKey: registrationAttemptId(), expectedSubscriptionId: sub.id, expectedPeriodEnd: end };
        this.cancellationAccessUntil = this.paidAccessUntil; this.cancellationNeedsRefresh = false; this.showCancellation = true;
      } catch (_) {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) {
          this.cancellationNeedsRefresh = true;
          this.cancellationError = 'No pudimos confirmar el estado y la fecha del periodo pagado. Vuelve a consultar antes de cancelar.';
        }
      } finally {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) this.preparingCancellation = false;
      }
    },
    async confirmCancellation() {
      if (this.cancelling || this.preparingCancellation || this.cancellationNeedsRefresh || !this.showCancellation || !this.canCancel || !this.cancellationIntent) return;
      const intent = { ...this.cancellationIntent }, owner = authorizationContext(this.$store), controller = new AbortController();
      if (intent.expectedSubscriptionId !== this.subscription.id || Date.parse(intent.expectedPeriodEnd) !== Date.parse(this.subscription.currentPeriodEnd || this.subscription.nextBillingTime)) return;
      const key = cancellationIntentKey(this.$store, this.subscription);
      saveCancellationIntent(key, intent);
      this.cancellationController = controller; this.cancelling = true; this.cancellationError = '';
      try {
        const result = this.validateBilling(await Payments.cancelSubscription(intent, controller.signal));
        if (controller.signal.aborted || this._isDestroyed || !isCurrentAuthorization(owner, this.$store)) return;
        if (!result.subscription || result.subscription.id !== intent.expectedSubscriptionId || !result.subscription.cancelAtPeriodEnd) throw new Error('UNCONFIRMED_CANCELLATION');
        this.subscription = result.subscription; this.license = result.license;
        this.cancellationSucceeded = this.cancellationScheduled && !this.refund;
        this.showCancellation = this.cancellationSucceeded;
        this.cancellationIntent = null; saveCancellationIntent(key, null);
      } catch (error) {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) {
          this.cancellationNeedsRefresh = true;
          this.cancellationError = error.status === 403 ? 'Tus permisos cambiaron. Consulta tu sesión antes de continuar.'
            : error.status === 409 ? 'La suscripción cambió. Consulta el estado y revisa la fecha antes de confirmar de nuevo.'
              : 'No pudimos confirmar el resultado. Consulta el estado antes de volver a intentar la cancelación.';
        }
      } finally {
        if (!controller.signal.aborted && !this._isDestroyed && isCurrentAuthorization(owner, this.$store)) this.cancelling = false;
      }
    },
    dateTimeLabel(value) {
      return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }).format(new Date(value)) + ' (hora de Ciudad de México)' : 'Por confirmar';
    },
    dateLabel(value) {
      return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date(value)) : 'Por confirmar';
    },
    money(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value)); }
  }
};
</script>

<style scoped>
.plan-billing.plan-billing--unsubscribed { border:0; border-radius:0; background:transparent; }
.plan-billing--unsubscribed .current-plan { padding:22px 24px; margin-bottom:24px; border-radius:12px; background:#eaf5f2; }
.plan-billing--unsubscribed .billing-plan-name h2 { color:#146a69; }
.billing-no-plan-copy { color:var(--settings-muted,#52696d); font-size:14px; line-height:1.6; margin:14px 0 0; }
.billing-refund-note { display:flex; align-items:center; gap:7px; width:fit-content; max-width:100%; padding:5px 9px; border-radius:7px; color:#346b5d; background:rgba(255,255,255,.7); font-size:12px; line-height:1.6; margin:12px 0 0; }
.billing-refund-note .v-icon { flex-shrink:0; color:var(--color-primary-700,#087b79); }
.billing-available-plans { border-top:1px solid var(--settings-border,#dce8e5); padding-top:24px; }
.billing-available-plans>h2 { color:var(--settings-ink,#193e43); font-size:17px; line-height:1.5; font-weight:600; margin:0 0 18px; }
html[data-theme="clinical-night"] .plan-billing--unsubscribed .current-plan { background:#1b3735; }
html[data-theme="clinical-night"] .plan-billing--unsubscribed .billing-plan-name h2 { color:#bcebe1; }
html[data-theme="clinical-night"] .billing-refund-note { background:#23473f; color:#c5ecdd; }
html[data-theme="clinical-night"] .billing-refund-note .v-icon { color:#9ed9c8; }
@media(max-width:700px) { .plan-billing--unsubscribed .current-plan { padding:18px 16px; } }
.billing-payment-list { list-style:none; padding:0; margin:18px 0 0; }
.billing-payment-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,auto); gap:16px; padding:20px 0; border-bottom:1px solid var(--settings-border,#dce8e5); }
.billing-payment-row:first-child { padding-top:0; }
.billing-payment-copy,.billing-payment-total { min-width:0; }
.billing-payment-copy p,.billing-payment-total p { margin:0; font-size:12px; line-height:1.7; color:var(--settings-muted,#52696d); overflow-wrap:anywhere; }
.billing-payment-copy .billing-payment-description { color:var(--settings-ink,#193e43); font-size:14px; font-weight:600; margin-bottom:5px; }
.billing-payment-total { text-align:right; }
.billing-payment-total .billing-payment-amount { color:var(--settings-ink,#193e43); font-size:18px; }
.billing-payment-total .billing-payment-status { font-weight:600; }
.billing-history-error { margin-top:16px; font-size:13px; line-height:1.6; color:var(--settings-muted,#52696d); }
.billing-history-error p { margin:0 0 6px; }
.billing-history-more,.billing-payment-receipt { margin-top:18px; }
@media(max-width:600px) { .billing-payment-row { grid-template-columns:minmax(0,1fr); gap:10px; } .billing-payment-total { text-align:left; } }
.billing-catalog-error,.billing-catalog-message { color:var(--settings-muted,#52696d); font-size:13px; line-height:1.6; }
.billing-catalog-message { margin:16px 0 0; }
.billing-cancellation-error { color:#a32834!important; font-size:13px; line-height:1.6; margin-top:12px!important; }
.billing-notice p { margin:7px 0 0; }
html[data-theme="clinical-night"] .billing-cancellation-error { color:#ffb9c3!important; }

.plan-billing { min-width:0; overflow:hidden; border:1px solid var(--settings-border,#dce8e5); border-radius:10px; background:var(--settings-surface,#fff); color:var(--settings-ink,#193e43); }
.current-plan,.billing-payments,.billing-management { padding:28px; }
.billing-overview { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,auto); align-items:start; gap:24px; }
.billing-title-row,.billing-plan-footer,.billing-management { display:flex; align-items:center; justify-content:space-between; gap:20px; }
.billing-plan-footer { justify-content:flex-end; }
.billing-title-row { justify-content:flex-start; flex-wrap:wrap; gap:10px 14px; }
.billing-eyebrow { color:var(--settings-muted,#52696d); font-size:12px; font-weight:500; margin:0 0 10px; }
.billing-plan-name h2 { font-size:28px; line-height:1.25; font-weight:600; letter-spacing:-.025em; margin:0; overflow-wrap:anywhere; }
.billing-clinic { color:var(--settings-muted,#52696d); font-size:14px; line-height:1.6; margin:8px 0 0; overflow-wrap:anywhere; }
.billing-status { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:4px 10px; background:#edf8f1; color:#256445; font-size:12px; font-weight:600; }
.billing-status::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
.billing-status--attention { background:#fff6e5; color:#825311; }
.billing-price { display:flex; flex-direction:column; gap:5px; text-align:right; max-width:320px; }
.billing-price strong { font-size:30px; font-weight:600; line-height:1.25; letter-spacing:-.025em; overflow-wrap:anywhere; }
.billing-price span { color:var(--settings-muted,#52696d); font-size:13px; line-height:1.6; }
.billing-details { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; margin:28px 0 0; padding:24px 0; border-top:1px solid var(--settings-border,#dce8e5); }
.billing-details dt { color:var(--settings-muted,#52696d); font-size:12px; margin-bottom:6px; }
.billing-details dd { font-size:14px; line-height:1.6; font-weight:600; margin:0; overflow-wrap:anywhere; }
.billing-management p { color:var(--settings-muted,#52696d); font-size:13px; line-height:1.7; margin:0; }
.billing-button { display:inline-flex; justify-content:center; align-items:center; gap:16px; min-height:44px; padding:10px 16px; border-radius:6px; font-size:13px; font-weight:600; line-height:1.5; text-decoration:none; flex-shrink:0; text-align:center; }
.billing-button--outline { border:1px solid var(--settings-border,#dce8e5); color:var(--settings-ink,#193e43); background:transparent; }
.billing-button--primary { background:var(--color-primary-700,#087b79); color:#fff; }
.billing-button:hover { filter:brightness(.95); }
.billing-button:disabled { opacity:.5; cursor:wait; }
.billing-payments,.billing-management { border-top:1px solid var(--settings-border,#dce8e5); }
.billing-payments h2,.billing-management h2 { font-size:15px; font-weight:600; line-height:1.5; margin:0 0 12px; }
.billing-payment-amount small { color:var(--settings-muted,#52696d); font-size:12px; font-weight:400; }
.billing-footnote { max-width:420px; }
.billing-management h2 { margin-bottom:5px; }
.billing-management>div { min-width:0; }
.billing-cancel { color:#a53838; min-height:44px; font-size:13px; font-weight:500; flex-shrink:0; padding:8px 0 8px 12px; }
.billing-cancel:hover,.billing-link:hover { text-decoration:underline; }
.billing-link { display:inline-flex; align-items:center; min-height:44px; color:var(--color-primary-700,#087b79); font-size:13px; font-weight:600; }
.billing-message { padding:28px; margin:0; font-size:14px; line-height:1.6; }
.billing-error { background:#fff1f2; color:#a32834; }
.billing-notice { padding:14px; border-radius:6px; background:var(--settings-soft,#f0f7f5); color:var(--settings-ink,#193e43); font-size:13px; line-height:1.6; margin-bottom:18px; }
.billing-access-notice { margin:20px 0 16px; padding:16px; }
.billing-access-notice>strong { display:block; font-size:14px; font-weight:600; line-height:1.5; }
.billing-access-notice p { margin:6px 0 0; max-width:760px; }
.billing-access-notice .billing-access-date { font-size:14px; line-height:1.6; font-weight:500; overflow-wrap:anywhere; }
.billing-dialog .v-card__title { word-break:normal; font-weight:600; line-height:1.4; }
.billing-dialog .v-card__text { color:var(--settings-muted,#52696d); line-height:1.7; padding-top:12px; }
html[data-theme="clinical-night"] .billing-dialog .v-card__text { color:#c7d8e2; }
html[data-theme="clinical-night"] .billing-dialog .billing-notice { background:#203e40; color:#daf2ed; }
.billing-dialog-actions { justify-content:flex-end; padding:16px 24px!important; gap:8px; flex-wrap:wrap; }
.plan-billing button:focus-visible,.plan-billing a:focus-visible { outline:3px solid var(--color-primary-700,#087b79); outline-offset:3px; }
html[data-theme="clinical-night"] .billing-status { background:#183e32; color:#c8f5de; }
html[data-theme="clinical-night"] .billing-status--attention { background:#4b3b1d; color:#fde5ad; }
html[data-theme="clinical-night"] .billing-cancel { color:#fca5a5; }
html[data-theme="clinical-night"] .billing-error { background:#492b35; color:#ffdae1; }
@media(max-width:700px) {
  .current-plan,.billing-payments,.billing-management { padding:20px; }
  .billing-overview,.billing-details { grid-template-columns:minmax(0,1fr); gap:20px; }
  .billing-price { text-align:left; max-width:none; }
  .billing-plan-name h2 { font-size:25px; }
  .billing-price strong { font-size:27px; }
  .billing-details { margin-top:24px; padding:20px 0; }
  .billing-plan-footer,.billing-management { flex-direction:column; align-items:stretch; gap:16px; }
  .billing-cancel { padding:8px 0; text-align:left; align-self:flex-start; }
  .billing-dialog-actions { padding:14px 16px!important; }
  .billing-dialog-actions .v-btn { white-space:normal; height:auto; min-height:44px; }
  .billing-dialog-actions .v-btn__content { white-space:normal; }
}
.plan-compare-heading { display:flex; flex-wrap:nowrap; align-items:flex-start; justify-content:space-between; gap:16px; padding:28px!important; border-bottom:1px solid var(--settings-border,#dce8e5); background:var(--settings-surface,#fff); color:var(--settings-ink,#193e43); }
.plan-compare-heading>div { min-width:0; flex:1; }
.plan-compare-heading .plan-compare-eyebrow { margin:0 0 7px; color:var(--color-primary-700,#087b79); font-size:11px; line-height:1.5; font-weight:600; letter-spacing:.04em; }
.plan-compare-heading h2 { margin:0; font-size:25px; line-height:1.3; font-weight:600; letter-spacing:-.025em; }
.plan-compare-heading p { margin:8px 0 0; color:var(--settings-muted,#52696d); font-size:13px; font-weight:400; line-height:1.6; }
.plan-compare-close { display:grid; place-items:center; flex-shrink:0; width:36px; height:36px; margin:-4px -4px 0 0; border-radius:6px; color:var(--settings-muted,#52696d); }
.plan-compare-close:hover { background:var(--settings-soft,#f0f7f5); }
.plan-compare-close .v-icon { color:inherit; }
.plan-compare-close:focus-visible { outline:3px solid var(--color-primary-700,#087b79); outline-offset:2px; }
.plan-compare-card .plan-compare-body { padding:28px!important; background:var(--settings-surface,#fff); }
.plan-compare-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; padding:20px 28px!important; border-top:1px solid var(--settings-border,#dce8e5); background:var(--settings-surface,#fff); }
.plan-compare-footer p { margin:0; font-size:12px; line-height:1.6; color:var(--settings-muted,#52696d); }
.plan-compare-footer .v-btn { min-height:44px; height:auto; padding:10px 16px!important; box-shadow:none; white-space:normal; }
.plan-compare-footer .v-btn__content { white-space:normal; }
.plan-compare-footer .billing-cancellation-error { flex-basis:100%; }
@media(max-width:600px) {
  .plan-compare-heading { padding:20px 16px!important; }
  .plan-compare-card .plan-compare-body { padding:20px 16px!important; }
  .plan-compare-heading h2 { font-size:21px; }
  .plan-compare-footer { padding:16px!important; flex-direction:column; align-items:stretch; gap:10px; }
  .plan-compare-footer .v-btn { margin:0!important; }
}

.billing-cancel-card { background:var(--settings-surface,#fff); color:var(--settings-ink,#193e43); }
.billing-cancel-card .billing-cancel-heading { display:flex; align-items:center; flex-wrap:nowrap; gap:14px; padding:28px 28px 24px!important; }
.billing-cancel-icon { display:grid; place-items:center; width:48px; height:48px; flex-shrink:0; border-radius:14px; background:var(--settings-soft,#f0f7f5); color:var(--color-primary-700,#087b79); }
.billing-cancel-icon .v-icon { color:inherit; }
.billing-cancel-heading-copy { flex:1; min-width:0; }
.billing-cancel-heading h2 { margin:0; color:var(--settings-ink,#193e43); font-size:24px; line-height:1.3; font-weight:600; letter-spacing:-.025em; overflow-wrap:anywhere; }
.billing-cancel-close { display:grid; place-items:center; align-self:flex-start; flex-shrink:0; width:36px; height:36px; margin:-8px -8px 0 0; border-radius:8px; color:var(--settings-muted,#52696d); }
.billing-cancel-close .v-icon { color:inherit; }
.billing-cancel-close:hover:not(:disabled) { background:var(--settings-soft,#f0f7f5); }
.billing-cancel-close:disabled { opacity:.45; cursor:default; }
.billing-cancel-close:focus-visible { outline:3px solid var(--color-primary-700,#087b79); outline-offset:2px; }
.billing-cancel-card .billing-cancel-body { padding:0 28px 24px!important; font-size:14px; line-height:1.7; }
.billing-cancel-body .billing-cancel-intro { margin:0 0 20px; overflow-wrap:anywhere; }
.billing-cancel-intro strong { color:var(--settings-ink,#193e43); font-weight:600; }
.billing-cancel-access { display:flex; align-items:flex-start; gap:12px; padding:18px; border:1px solid var(--settings-border,#dce8e5); border-radius:10px; background:var(--settings-soft,#f0f7f5); color:var(--settings-ink,#193e43); }
.billing-cancel-access>.v-icon { flex-shrink:0; margin-top:2px; color:var(--color-primary-700,#087b79); }
.billing-cancel-access>div { min-width:0; }
.billing-cancel-access p { margin:0 0 4px; font-size:12px; }
.billing-cancel-access strong { display:block; font-size:15px; line-height:1.6; font-weight:600; overflow-wrap:anywhere; }
.billing-cancel-access span { display:block; margin-top:8px; color:var(--settings-muted,#52696d); font-size:12px; line-height:1.6; }
.billing-cancel-effects { padding:22px 0 0; }
.billing-cancel-effects h3 { margin:0 0 8px; color:var(--settings-ink,#193e43); font-size:14px; line-height:1.5; font-weight:600; }
.billing-cancel-effects p { margin:6px 0 0; font-size:13px; line-height:1.7; }
.billing-cancel-body .billing-cancel-feedback { padding:12px 14px; border:1px solid currentColor; border-radius:8px; }
.billing-cancel-body .billing-cancel-progress { margin:14px 0 0; font-size:12px; }
.billing-cancel-card .billing-cancel-actions { flex-wrap:nowrap; gap:12px; padding:20px 28px!important; border-top:1px solid var(--settings-border,#dce8e5); background:var(--settings-surface,#fff); }
.billing-cancel-actions .v-btn { flex:1; min-width:0!important; min-height:44px; height:auto; margin:0!important; padding:12px 14px!important; font-size:13px; letter-spacing:0; white-space:normal; box-shadow:none; }
.billing-cancel-actions .v-btn__content { white-space:normal; }
html[data-theme="clinical-night"] .billing-cancel-card { background:var(--settings-surface,#18292d)!important; }
html[data-theme="clinical-night"] .billing-cancel-icon,
html[data-theme="clinical-night"] .billing-cancel-access>.v-icon { color:#9ed9c8; }
html[data-theme="clinical-night"] .billing-cancel-actions .v-btn.primary--text { color:#9ed9c8!important; }
@media(max-width:600px) {
  .billing-cancel-card .billing-cancel-heading { gap:10px; padding:24px 20px 20px!important; }
  .billing-cancel-icon { width:40px; height:40px; border-radius:12px; }
  .billing-cancel-heading h2 { font-size:21px; }
  .billing-cancel-card .billing-cancel-body { padding:0 20px 20px!important; }
  .billing-cancel-access { padding:14px; gap:10px; }
  .billing-cancel-access strong { font-size:14px; }
  .billing-cancel-card .billing-cancel-actions { flex-direction:column; align-items:stretch; gap:10px; padding:16px 20px!important; }
  .billing-cancel-actions .v-btn { flex:none; width:100%; }
}

.billing-cancel-card .billing-cancel-success { padding:36px 28px 28px!important; text-align:center; color:var(--settings-muted,#52696d); font-size:14px; line-height:1.7; }
.billing-success-mark { display:block; width:88px; height:88px; margin:0 auto 22px; border-radius:50%; background:var(--settings-soft,#f0f7f5); color:var(--color-primary-700,#087b79); animation:billing-success-appear .35s ease-out both; }
.billing-success-mark circle,.billing-success-mark path { stroke:currentColor; stroke-width:3.5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1; stroke-dashoffset:0; }
.billing-success-ring { transform:rotate(-90deg); transform-origin:center; animation:billing-success-draw .5s ease-out both; }
.billing-success-check { animation:billing-success-draw .3s ease-out .35s both; }
.billing-cancel-success h2 { margin:0 0 12px; color:var(--settings-ink,#193e43); font-size:25px; line-height:1.3; font-weight:600; letter-spacing:-.025em; }
.billing-cancel-success p { margin:0; overflow-wrap:anywhere; }
.billing-cancel-success strong { color:var(--settings-ink,#193e43); font-weight:600; }
.billing-cancel-success .billing-success-access { margin-top:20px; padding:14px 16px; border-radius:10px; background:var(--settings-soft,#f0f7f5); font-size:13px; }
html[data-theme="clinical-night"] .billing-success-mark { color:#9ed9c8; }
@keyframes billing-success-appear { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
@keyframes billing-success-draw { from { stroke-dashoffset:1; } to { stroke-dashoffset:0; } }
@media(prefers-reduced-motion:reduce) {
  .billing-success-mark,.billing-success-ring,.billing-success-check { animation:none; }
}
@media(max-width:600px) {
  .billing-cancel-card .billing-cancel-success { padding:28px 20px 24px!important; }
  .billing-cancel-success h2 { font-size:22px; }
}
</style>
