<template>
  <account-flow-shell class="plan-change-page" :step="0" title-id="plan-change-title">
    <div class="change-content">
      <v-btn class="change-close" icon aria-label="Cerrar y volver a Plan y facturación" title="Volver a Plan y facturación" :disabled="busy || openingPayPal || returnContinuing || waitingForPayPalConfirmation" @click="leave"><v-icon aria-hidden="true">mdi-close</v-icon></v-btn>
      <header class="change-heading" role="status" aria-live="polite" aria-atomic="true">
        <span class="change-symbol" :class="{ 'change-symbol--working': canManage && !error && (loading || busy || openingPayPal || returnContinuing || waitingForPayPalConfirmation || ['preparing', 'applying', 'discarding'].includes(phase)) }" aria-hidden="true"><v-icon>{{ phase === 'active' || phase === 'scheduled' ? 'mdi-check' : 'mdi-swap-horizontal' }}</v-icon></span>
        <h1 id="plan-change-title" ref="title" tabindex="-1">{{ heading }}</h1>
        <p>{{ description }}</p>
      </header>
      <p v-if="!canManage" class="change-alert" role="alert">Sólo una cuenta administradora puede cambiar el plan del consultorio.</p>
      <template v-else>
        <div v-if="error" ref="alert" class="change-alert" role="alert" tabindex="-1">{{ error }}
          <v-btn v-if="authRequired" text @click="login">Iniciar sesión para retomar</v-btn>
          <v-btn v-else-if="pendingRoute" text :to="pendingRoute">Retomar cambio en curso</v-btn>
        </div>
        <p v-if="loading" class="change-loading" role="status">{{ returnContinuing ? 'Finalizando el cambio automáticamente…' : 'Consultando el cambio de plan…' }}</p>
        <template v-else>
          <dl v-if="(offer || attempt) && !discardIntent" class="change-summary">
            <div><dt>Nuevo plan para {{ businessName }}</dt><dd>{{ targetName }}</dd></div>
            <div v-if="displayQuote"><dt>Importe del cambio hoy</dt><dd>{{ amount(displayQuote.amountDueNow, displayQuote.currency) }} <small>{{ displayQuote.currency }}</small></dd></div>
            <div v-if="displayQuote"><dt>Precio recurrente</dt><dd>{{ amount(displayQuote.recurringAmount, displayQuote.currency) }} <small>{{ displayQuote.currency }}{{ intervalLabel }}</small></dd></div>
            <div v-if="displayQuote"><dt>{{ displayQuote.kind === 'downgrade' ? 'Cambio a partir del' : 'Fecha de aplicación' }}</dt><dd class="change-date">{{ dateLabel(displayQuote.effectiveAt) }}</dd></div>
            <div v-if="displayQuote"><dt>Próxima fecha de facturación</dt><dd class="change-date">{{ dateLabel(displayQuote.nextBillingAt) }}</dd></div>
          </dl>
          <template v-if="reviewing && quote && offer">
            <p class="change-note">{{ quote.kind === 'upgrade' ? 'Tu plan actual sigue disponible mientras completas el cambio.' : 'Conservas tu plan actual hasta la fecha indicada. El nuevo precio se aplicará en la renovación.' }}</p>
            <fieldset v-if="documents.length" class="change-legal" :disabled="busy || sent">
              <legend>Condiciones del cambio</legend>
              <div v-for="doc in documents" :key="doc.documentVersionId" class="change-document">
                <v-checkbox v-if="!doc.acceptedInRegistration" v-model="accepted[doc.documentVersionId]" color="var(--color-primary-700)" hide-details :disabled="busy || sent">
                  <template v-slot:label><span>{{ doc.requiredAction === 'accept' ? 'Acepto' : doc.requiredAction === 'consent' ? 'Doy mi consentimiento para' : 'He leído' }} {{ doc.title }}</span></template>
                </v-checkbox>
                <button type="button" class="change-document-link" :aria-label="'Leer ' + doc.title" :disabled="busy" @click="openDocument(doc, $event)">{{ doc.acceptedInRegistration ? doc.title + ' · aceptación vigente' : 'Leer documento' }}</button>
              </div>
            </fieldset>
            <p v-else class="change-note" role="status">No pudimos cargar las condiciones vigentes. Actualiza la cotización para continuar.<v-btn text :disabled="busy" @click="initialize">Actualizar cotización</v-btn></p>
          </template>
          <template v-else-if="discardIntent">
            <div class="change-actions">
              <button v-if="paymentUrl && !busy && !openingPayPal && !returnContinuing" type="button" class="change-paypal-button" aria-label="Conservar mi plan actual en PayPal" @click="openPayPal"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" width="228" height="44" alt="Conservar mi plan actual en PayPal"></button>
              <v-btn v-if="error || returnRecovery || !paymentUrl" outlined :disabled="busy || authRequired" @click="discardChange()">Reintentar descarte</v-btn>
              <v-btn v-if="!paymentUrl || error" text :disabled="busy || authRequired" @click="refresh">Actualizar estado</v-btn>
            </div>
          </template>
          <template v-else-if="attempt">
            <p v-if="phase === 'scheduled'" class="change-note">Tu plan actual se mantiene hasta el {{ dateLabel(change.effectiveAt) }}. No necesitas aprobar otro pago para este cambio.</p>
            <div class="change-actions">
              <v-btn v-if="canConfirm && !pendingPayPalId && !openingPayPal && !returnContinuing && !waitingForPayPalConfirmation && (returnRecovery || error)" class="change-primary" depressed :disabled="busy || authRequired" @click="confirmApproval">Continuar con el cambio</v-btn>
              <v-btn v-if="!['active', 'scheduled'].includes(phase) && !returnContinuing && !waitingForPayPalConfirmation && (!paymentUrl || error)" text :disabled="busy || authRequired" @click="refresh">Actualizar estado</v-btn>
              <v-btn v-if="phase === 'discarded'" class="change-primary" depressed :disabled="busy" @click="leave">Volver a elegir un plan</v-btn>
              <v-btn v-if="['active', 'scheduled'].includes(phase) && error" class="change-primary" depressed :disabled="busy" @click="$router.push({ name: 'home' })">Ir al inicio de MedSync</v-btn>
            </div>
            <p v-if="returnRecovery && !error && !discardIntent" class="change-note" role="status">No pudimos retomar tu autorización automáticamente. Puedes consultar el estado o continuar con el mismo cambio.</p>
            <p v-if="missingAttempt && hasTarget" class="change-note"><v-btn text :disabled="busy" @click="recoverReview">Retomar revisión del cambio</v-btn></p>
          </template>
          <div v-else class="change-actions"><v-btn v-if="missingAttempt && hasTarget" outlined :disabled="busy || authRequired" @click="recoverReview">Retomar revisión del cambio</v-btn><v-btn v-else-if="hasTarget && !attemptId" outlined :disabled="busy || authRequired" @click="initialize">Actualizar cotización</v-btn><v-btn v-if="attemptId" text :disabled="busy || authRequired" @click="refresh">Actualizar estado</v-btn><v-btn text :disabled="busy" @click="leave">Volver a Plan y facturación</v-btn></div>
          <div v-if="!discardIntent && ((reviewing && quote && offer) || paymentUrl || pendingPayPalId) && !returnContinuing" class="change-actions">
            <button type="button" class="change-paypal-button" aria-label="Continuar con PayPal" :aria-busy="busy || openingPayPal || pendingPayPalId || waitingForPayPalConfirmation ? 'true' : 'false'" :disabled="reviewing ? !canSubmit : busy || authRequired || openingPayPal || waitingForPayPalConfirmation || !paymentUrl" @click="reviewing ? submit() : openPayPal()">
              <img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" width="228" height="44" alt="Continuar con PayPal">
            </button>
          </div>
          <p v-if="paypalNotice" class="change-note" role="status">{{ paypalNotice }}</p>
        </template>
      </template>
    </div>
    <v-dialog v-model="legalOpen" width="calc(100% - 24px)" max-width="720" scrollable @input="restoreDocumentFocus">
      <v-card v-if="selectedDocument" class="flow-legal change-legal-dialog">
        <header class="change-document-heading"><h2 ref="legalTitle" id="change-legal-title" tabindex="-1">{{ selectedDocument.title }}</h2><v-btn icon aria-label="Cerrar documento" @click="closeDocument"><v-icon aria-hidden="true">mdi-close</v-icon></v-btn></header>
        <v-card-text class="change-document-body" tabindex="0" role="region" aria-label="Contenido del documento" @click="preventDocumentNavigation" v-html="legalHtml" />
      </v-card>
    </v-dialog>
  </account-flow-shell>
</template>
<script>
import DOMPurify from 'dompurify';
import SHA256 from 'crypto-js/sha256';
import { openPlanChangePayPal, returnFromPlanChangePayPal } from '../../domain/billing/planChangePayPal';
import AccountFlowShell from './AccountFlowShell.vue';
import Payments from '../../services/core/billing/DAPaymentsService';
import { registrationAttemptId } from '../../utils/registration';
import { checkoutAttemptId, checkoutLoginRoute, canManageCheckout, selectedOffer, legalDocuments, paidSessionApplied, paymentErrorMessage } from '../../domain/billing/checkout';
import { newerSubscriptionSnapshot } from '../../domain/billing/subscriptionUpdates';
import { usablePlanChangeQuote, usablePlanChangeAttempt, planChangeSnapshotApplied, planChangePaymentUrl, planChangeOwner, rememberPlanChangeDiscard, loadPlanChangeDiscard, forgetPlanChangeDiscard, cancelledPlanChange } from '../../domain/billing/planChange';

export default {
  name: 'AccountPlanChange',
  components: { AccountFlowShell },
  data: () => ({ loading: true, busy: false, error: '', authRequired: false, catalog: null, source: null, quote: null, prepared: null, accepted: {}, sent: false, intent: null, legalAcceptanceId: '', attempt: null, snapshot: null, snapshotRevision: '', sessionFresh: false, sessionRefreshing: false, requestController: null, creatingId: '', reviewKey: '', recovering: false, missingAttempt: false, legalOpen: false, selectedDocument: null, pendingRoute: null, pendingPayPalId: '', openingPayPal: false, returnContinuing: false, returnRecovery: false, completionRedirected: false, paypalNotice: '', waitingForPayPalConfirmation: false, discardIntent: null, discardCompleted: false }),
  computed: {
    business() { return this.$store.getters['CORE/AUTH/getBusiness'] || {}; },
    businessName() { return this.business.name || 'tu consultorio'; },
    canManage() { return canManageCheckout(this.$store.getters['CORE/AUTH/getRole']); },
    owner() { return planChangeOwner(this.$store); },
    streamCredential() { const auth = this.$store.state && this.$store.state.CORE.AUTH || {}; return JSON.stringify([auth.accessExpiresAt, auth.token, auth.accessRevision]); },
    attemptId() { return checkoutAttemptId(this.$route.query.attempt_id); },
    hasTarget() { return typeof this.$route.query.plan_code === 'string' && typeof this.$route.query.price_code === 'string'; },
    reviewing() { return !this.discardIntent && (!this.attemptId || this.recovering); },
    offer() { return selectedOffer(this.catalog, this.attempt && this.attempt.planCode || this.$route.query.plan_code, this.attempt && this.attempt.planPriceCode || this.$route.query.price_code); },
    targetName() { return this.offer ? this.offer.name : 'Plan solicitado'; },
    change() { return this.attempt && this.attempt.planChange || null; },
    displayQuote() { return this.change && usablePlanChangeQuote(this.change) ? this.change : this.quote; },
    documents() { return legalDocuments(this.prepared); },
    canSubmit() { return Boolean(this.canManage && this.catalog && this.catalog.checkoutAvailable === true && this.reviewing && !this.loading && !this.busy && !this.sent && this.source && this.quote && this.offer && this.documents.length && this.documents.every(doc => doc.acceptedInRegistration || this.accepted[doc.documentVersionId] === true)); },
    closed() { return Boolean(this.attempt && (this.attempt.abandoned || ['cancelled', 'expired', 'failed'].includes(this.attempt.checkoutStatus)) || this.snapshot && this.snapshot.subscription && this.attempt && this.snapshot.subscription.id === this.attempt.subscriptionId && ['cancelled', 'expired', 'suspended'].includes(this.snapshot.subscription.status)); },
    phase() {
      if (this.discardCompleted) return 'discarded';
      if (this.discardIntent) return this.paymentUrl ? 'discard_approval' : 'discarding';
      if (this.closed || this.attempt && this.attempt.status === 'rejected' || this.change && this.change.state === 'failed') return 'failed';
      if (this.change && this.change.state === 'effective') return this.sessionFresh && planChangeSnapshotApplied(this.attempt, this.snapshot, this.business.id_business) && paidSessionApplied(this.business, this.snapshot.license, this.$store.getters['CORE/AUTH/getTenantOperational']) ? 'active' : 'applying';
      if (this.change && this.change.state === 'scheduled') return 'scheduled';
      if (this.change && this.change.action === 'approve_payment') return 'payment';
      if (this.change && this.change.action === 'approve_subscription') return 'approval';
      return this.attemptId && !this.recovering ? 'preparing' : 'review';
    },
    paymentUrl() { if (this.discardCompleted) return ''; if (this.discardIntent) return this.canManage && this.change && this.change.cancellationRequested === true && !this.closed ? planChangePaymentUrl(this.change.checkoutUrl) : ''; return this.canManage && this.attempt && this.attempt.status === 'ready' && this.change && ['approve_subscription', 'approve_payment'].includes(this.change.action) && !['failed', 'scheduled', 'effective'].includes(this.change.state) && !this.closed ? planChangePaymentUrl(this.change.checkoutUrl) : ''; },
    canConfirm() { return Boolean(!this.discardCompleted && !this.discardIntent && !(this.change && this.change.cancellationRequested) && this.canManage && this.attempt && this.attempt.status === 'ready' && !this.closed && this.change && !['failed', 'scheduled', 'effective'].includes(this.change.state)); },
    canDiscardAttempt() { return Boolean(this.canManage && this.attemptId && !this.discardCompleted && !this.closed && (!this.attempt || ['pending', 'processing'].includes(this.attempt.status) || this.attempt.status === 'ready' && this.change && ['preparing', 'awaiting_approval'].includes(this.change.state) && this.change.action !== 'approve_payment')); },
    canReturnToMedsync() { return Boolean(this.canManage && !this.loading && !this.busy && !this.openingPayPal && !this.returnContinuing && !this.error && !this.authRequired
      && this.requestController && this.current(this.requestController) && ['active', 'scheduled'].includes(this.phase)); },
    intervalLabel() { if (!this.offer) return ''; const price = this.offer.price; return ' / ' + (price.billingIntervalCount === 1 ? (price.billingInterval === 'year' ? 'año' : 'mes') : price.billingIntervalCount + (price.billingInterval === 'year' ? ' años' : ' meses')); },
    heading() { if (this.discardCompleted) return 'Elección descartada'; if (this.discardIntent) return this.paymentUrl ? 'Conserva tu plan actual en PayPal' : 'Descartando tu selección'; if (this.returnContinuing || this.waitingForPayPalConfirmation) return 'Confirmando tu cambio'; if (this.openingPayPal || this.pendingPayPalId) return 'Revisa tu cambio de plan'; return { review: 'Revisa tu cambio de plan', preparing: 'Revisa tu cambio de plan', approval: 'Revisa tu cambio de plan', payment: 'Revisa tu cambio de plan', applying: 'Estamos aplicando tu nuevo plan', active: 'Tu nuevo plan ya está activo', scheduled: 'Tu cambio de plan está programado', failed: 'No pudimos completar este cambio' }[this.phase]; },
    description() {
      if (this.discardCompleted) return 'Tu plan actual no cambió. Puedes volver a elegir un plan.';
      if (this.discardIntent) return this.paymentUrl ? 'PayPal necesita tu autorización para conservar el plan anterior y poder elegir de nuevo.' : 'Estamos cerrando la selección anterior. Tu plan actual se conserva.';
      if (this.returnContinuing || this.waitingForPayPalConfirmation) return 'Estamos comprobando tu autorización con PayPal.';
      if (this.openingPayPal) return 'Completa la autorización en la ventana segura de PayPal.';
      if (this.pendingPayPalId) return 'Estamos preparando la ventana segura de PayPal.';
      if (this.phase === 'active') return 'El nuevo acceso de ' + this.businessName + ' ya está disponible en MedSync.';
      if (this.phase === 'scheduled') return 'Conservas las funciones de tu plan actual hasta la fecha indicada.';
      if (this.phase === 'failed') return 'Tu plan actual no cambia por este resultado. Consulta el estado de esta misma solicitud antes de iniciar otra.';
      if (this.phase === 'applying') return 'Estamos actualizando el acceso de tu consultorio.';
      if (this.phase === 'payment') return 'Autoriza la diferencia del periodo en la ventana segura de PayPal.';
      if (this.phase === 'approval') return 'Revisa el importe y autoriza el cambio en la ventana segura de PayPal.';
      if (this.phase === 'preparing') return 'Tu solicitud está en preparación.';
      return 'Revisa el importe y las condiciones antes de continuar.';
    },
    legalHtml() { return DOMPurify.sanitize(this.selectedDocument ? this.selectedDocument.contentHtml : '', { ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'], ALLOWED_ATTR: ['href', 'colspan', 'rowspan'], ALLOW_DATA_ATTR: false }); }
  },
  watch: {
    '$route.query': { deep: true, handler() { if (this.creatingId && this.attemptId === this.creatingId) return; this.initialize(); } },
    canReturnToMedsync(ready) { if (ready) this.returnToMedsync(); },
    paymentUrl(url) { if (url) this.continueToPayPal(); },
    phase(value) { if (['failed', 'applying', 'active', 'scheduled'].includes(value)) this.pendingPayPalId = ''; },
    owner() { this.initialize(); },
    streamCredential() { this.startUpdates(); }
  },
  created() { this.initialize(); },
  mounted() { if (this.$refs.title) this.$refs.title.focus(); },
  beforeRouteLeave(to, _from, next) {
    if (to.name === 'login' || !this.canDiscardAttempt) { next(); return; }
    if (this.busy || this.openingPayPal || this.returnContinuing || this.waitingForPayPalConfirmation) { next(false); return; }
    this.discardChange(false).then(cancelled => next(cancelled === true), () => next(false));
  },
  beforeDestroy() { this.closePayPalWindow(); this.pendingPayPalId = ''; if (this.requestController) this.requestController.abort(); this.stopUpdates(); this.closeDocument(); },
  methods: {
    current(controller) { return !this._isDestroyed && this.requestController === controller && !controller.signal.aborted && controller.owner === this.owner; },
    controller() { this.sessionRefreshing = false; this.metadataRequest = null; this.metadataRevision = ''; if (this.requestController) this.requestController.abort(); const controller = new AbortController(); controller.owner = this.owner; this.requestController = controller; return controller; },
    validSource(source) { return Boolean(source && source.organizationId === this.business.id_business && source.productCode === 'medsync' && source.id); },
    showError(error) { if (this._isDestroyed) return; this.closePayPalWindow(); this.pendingPayPalId = ''; this.authRequired = error && error.status === 401; this.error = paymentErrorMessage(error); this.$nextTick(() => { if (this.$refs.alert) this.$refs.alert.focus(); }); },
    async initialize() {
      if (returnFromPlanChangePayPal(this.attemptId, this.$route.query.result)) { this.loading = true; this.returnContinuing = true; return; }
      this.closePayPalWindow(); this.paypalNotice = ''; this.stopUpdates(); const controller = this.controller(); this.loading = true; this.busy = false; this.pendingPayPalId = ''; this.openingPayPal = false; this.returnContinuing = false; this.returnRecovery = false; this.completionRedirected = false; this.discardCompleted = false; this.discardIntent = this.attemptId ? loadPlanChangeDiscard(this.attemptId, this.owner) : null; this.error = ''; this.authRequired = false; this.catalog = null; this.source = null; this.quote = null; this.prepared = null; this.accepted = {}; this.sent = false; this.intent = null; this.legalAcceptanceId = ''; this.attempt = null; this.snapshot = null; this.snapshotRevision = ''; this.sessionFresh = false; this.sessionRefreshing = false; this.recovering = false; this.missingAttempt = false; this.pendingRoute = null; this.reviewKey = ''; this.metadataRevision = ''; this.metadataRequest = null; this.closeDocument();
      if (!this.canManage) { this.loading = false; return; }
      if (this.$route.query.attempt_id && !this.attemptId) { this.error = 'El enlace del cambio no es válido. Abre la solicitud original.'; this.loading = false; return; }
      try {
        const results = await Promise.allSettled([Payments.plans(controller.signal), Payments.subscription(controller.signal)]);
        if (!this.current(controller)) return; this.catalog = results[0].status === 'fulfilled' ? results[0].value : null;
        if (results[1].status === 'rejected') throw results[1].reason;
        const source = results[1].value;
        if (!this.validSource(source)) throw { code: 'PAYMENT_INVALID_RESPONSE' }; this.source = source;
        if (this.attemptId) { await this.readAttempt(controller); return; }
        if (await this.resumePending(controller, source)) return;
        await this.prepareReview(controller);
      } catch (error) { if (this.current(controller)) { this.missingAttempt = error.status === 404 && Boolean(this.attemptId); this.showError(error); } }
      finally { if (this.current(controller)) { this.loading = false; this.startUpdates(); this.continueAfterPayPalReturn(); } }
    },
    async resumePending(controller, source, openPayPal = false) {
      const pending = source.pendingPlanChange;
      if (!pending || ['effective', 'failed'].includes(pending.state)) return false;
      const id = checkoutAttemptId(pending.attemptId);
      if (!id) throw { code: 'CHECKOUT_IN_PROGRESS' };
      const attempt = await Payments.attempt(id, controller.signal);
      if (!this.current(controller)) return true;
      if (!usablePlanChangeAttempt(attempt, id) || attempt.subscriptionId && attempt.subscriptionId !== source.id || attempt.planCode !== pending.targetPlanCode || attempt.planPriceCode !== pending.targetPlanPriceCode) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      this.pendingRoute = { name: 'accountPlanChange', query: { attempt_id: id } };
      if (this.hasTarget && (this.$route.query.plan_code !== attempt.planCode || this.$route.query.price_code !== attempt.planPriceCode)) throw { code: 'CHECKOUT_IN_PROGRESS' };
      if (openPayPal) {
        this.creatingId = id;
        await this.$router.replace(this.pendingRoute);
        if (!this.current(controller)) return true;
        this.intent = Object.freeze({ idempotencyKey: id, planCode: attempt.planCode, planPriceCode: attempt.planPriceCode });
        this.adoptAttempt(attempt); this.prepared = null; this.accepted = {};
        this.pendingPayPalId = this.paypalPopup ? id : '';
        if (!this.continueToPayPal()) await this.readSnapshot(controller);
      } else if (id === this.attemptId) { this.adoptAttempt(attempt); this.prepared = null; await this.readSnapshot(controller); }
      else await this.$router.replace(this.pendingRoute);
      return true;
    },
    async prepareReview(controller) {
      if (!this.offer) throw { code: 'INVALID_PAYMENT_REQUEST' };
      if (!this.source || this.source.status !== 'active' || this.source.cancelAtPeriodEnd || this.source.cancellation) throw { code: 'PLAN_CHANGE_UNAVAILABLE' };
      const quote = await Payments.planChangeQuote({ expectedSubscriptionId: this.source.id, targetPlanCode: this.offer.planCode, targetPlanPriceCode: this.offer.planPriceCode }, controller.signal);
      if (!this.current(controller)) return;
      if (!usablePlanChangeQuote(quote) || quote.currency !== this.offer.price.currency) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      this.quote = { ...quote };
      this.reviewKey = this.attemptId || registrationAttemptId();
      const prepared = await Payments.prepareLegal(this.reviewKey, controller.signal);
      if (!this.current(controller)) return;
      if (!legalDocuments(prepared).length) throw { code: 'LEGAL_UNAVAILABLE' }; this.prepared = prepared;
    },
    async recoverReview() {
      if (!this.canManage || this.busy || !this.missingAttempt || !this.hasTarget) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.recovering = true; this.sent = false;
      try { const source = await Payments.subscription(controller.signal); if (!this.current(controller)) return; if (!this.validSource(source)) throw { code: 'PAYMENT_INVALID_RESPONSE' }; this.source = source; if (await this.resumePending(controller, source)) return; await this.prepareReview(controller); }
      catch (error) { if (this.current(controller)) this.showError(error); }
      finally { if (this.current(controller)) this.busy = false; }
    },
    adoptAttempt(value) {
      const expected = this.intent || this.attempt;
      if (!usablePlanChangeAttempt(value, this.attemptId) || value.subscriptionId && this.source && value.subscriptionId !== this.source.id) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      if (expected && (value.planCode !== expected.planCode || value.planPriceCode !== expected.planPriceCode)) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      if (value.status === 'ready' && ['approve_subscription', 'approve_payment'].includes(value.planChange.action) && value.planChange.checkoutUrl != null && !planChangePaymentUrl(value.planChange.checkoutUrl)) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      if (value.status === 'rejected' || value.planChange && ['failed', 'scheduled', 'effective'].includes(value.planChange.state)) this.pendingPayPalId = '';
      if (value.planChange && value.planChange.cancellationRequested && !this.discardIntent) { rememberPlanChangeDiscard(this.attemptId, this.owner); this.discardIntent = loadPlanChangeDiscard(this.attemptId, this.owner) || { attemptId: this.attemptId, owner: this.owner, planCode: '', planPriceCode: '' }; }
      this.attempt = value; this.missingAttempt = false; this.recovering = false; this.sessionFresh = false;
      if (value.planChange && ['scheduled', 'effective'].includes(value.planChange.state)) { this.error = ''; this.authRequired = false; }
    },
    async readAttempt(controller, discardNavigate = true) {
      const value = await Payments.attempt(this.attemptId, controller.signal);
      if (!this.current(controller)) return; this.adoptAttempt(value);
      await this.readSnapshot(controller);
      return this.current(controller) ? this.finishDiscardFromRead(controller, discardNavigate) : false;
    },
    async readSnapshot(controller) {
      const revision = this.snapshotRevision, snapshot = await Payments.savedSnapshot(controller.signal);
      if (!this.current(controller)) return;
      if (revision === this.snapshotRevision && newerSubscriptionSnapshot(snapshot, this.business.id_business, this.snapshotRevision)) { this.snapshot = snapshot; this.snapshotRevision = snapshot.revision; }
      await this.refreshSession(controller);
    },
    async submit() {
      if (!this.canSubmit) return;
      if (!legalDocuments(this.prepared).length) { this.showError({ code: 'LEGAL_VERSION_CHANGED' }); return; }
      if (!this.reservePayPalWindow()) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.authRequired = false;
      const intent = { idempotencyKey: this.reviewKey, expectedSubscriptionId: this.source.id, planCode: this.offer.planCode, planPriceCode: this.offer.planPriceCode, expectedAmountDueNow: this.quote.amountDueNow };
      try {
        const source = await Payments.subscription(controller.signal);
        if (!this.current(controller)) return;
        if (!this.validSource(source) || source.id !== intent.expectedSubscriptionId) throw { code: 'PAYMENT_CONFLICT' };
        if (await this.resumePending(controller, source, true)) return;
        this.intent = Object.freeze(intent); this.creatingId = intent.idempotencyKey;
        await this.$router.replace({ name: 'accountPlanChange', query: { attempt_id: intent.idempotencyKey, plan_code: intent.planCode, price_code: intent.planPriceCode } });
        if (!this.current(controller)) return; this.sent = true; this.pendingPayPalId = this.paypalPopup ? intent.idempotencyKey : '';
        const accepted = await Payments.acceptLegal({ requestId: this.prepared.requestId, idempotencyKey: intent.idempotencyKey, confirmations: this.documents.map(doc => ({ documentVersionId: doc.documentVersionId, contentHash: doc.contentHash, accepted: true })) }, controller.signal);
        if (!this.current(controller)) return;
        if (!accepted || accepted.accepted !== true || accepted.requestId !== this.prepared.requestId || !accepted.legalAcceptanceId) throw { code: 'LEGAL_ACCEPTANCE_INVALID' };
        this.legalAcceptanceId = accepted.legalAcceptanceId;
        const value = await Payments.changePlan({ ...intent, legalAcceptanceId: this.legalAcceptanceId }, controller.signal);
        if (!this.current(controller)) return; this.adoptAttempt(value); this.prepared = null; this.accepted = {};
        if (this.continueToPayPal()) return;
        await this.readSnapshot(controller);
      } catch (error) {
        if (!this.current(controller)) return; this.showError(error);
        if (this.sent && this.attemptId) { try { await this.readAttempt(controller); } catch (lookup) { if (this.current(controller)) this.missingAttempt = lookup.status === 404; } }
      } finally { if (this.current(controller)) { this.busy = false; this.creatingId = ''; this.startUpdates(); this.refreshFromSnapshot(); } }
    },
    async refresh() {
      if (this.busy || this.loading || !this.attemptId || !this.canManage) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.authRequired = false;
      try { await this.readAttempt(controller); }
      catch (error) { if (this.current(controller)) { this.missingAttempt = error.status === 404; this.showError(error); } }
      finally { if (this.current(controller)) { this.busy = false; this.startUpdates(); this.continueAfterPayPalReturn(); } }
    },
    async confirmApproval() {
      if (!this.canConfirm || this.busy || this.loading || this.authRequired) return;
      const controller = this.controller(); this.busy = true; this.error = '';
      try {
        // Manual recovery also consumes any earlier return before resuming the same attempt.
        try { const key = 'medsync.plan-change.paypal.' + this.attemptId, record = JSON.parse(window.sessionStorage.getItem(key)); if (record && record.owner === this.owner) window.sessionStorage.setItem(key, JSON.stringify({ ...record, used: true })); } catch (_) { /* Billing still owns financial idempotency. */ }
        const value = await Payments.confirm(this.attemptId, controller.signal);
        if (!this.current(controller)) return; this.adoptAttempt(value);
        await this.readSnapshot(controller);
      } catch (error) { if (this.current(controller)) { this.showError(error); if (!this.authRequired) { try { await this.readAttempt(controller); } catch (_) { /* Keep the same key after an unknown confirmation result. */ } } } }
      finally { if (this.current(controller)) { this.busy = false; this.startUpdates(); this.refreshFromSnapshot(); } }
    },
    async refreshSession(controller) {
      if (!this.current(controller) || this.sessionRefreshing || !planChangeSnapshotApplied(this.attempt, this.snapshot, this.business.id_business)) return;
      const revision = this.snapshotRevision; this.sessionRefreshing = true;
      try {
        const result = await this.$store.dispatch('CORE/AUTH/refreshAccess', { hydrate: true });
        if (!this.current(controller) || revision !== this.snapshotRevision || !planChangeSnapshotApplied(this.attempt, this.snapshot, this.business.id_business)) return;
        const session = result && result.success === true && result.data;
        this.sessionFresh = Boolean(session && session.authenticated === true && session.business && session.business.id_business === this.business.id_business
          && paidSessionApplied(session.business, this.snapshot.license, session.tenantOperational) && paidSessionApplied(this.business, this.snapshot.license, this.$store.getters['CORE/AUTH/getTenantOperational']));
        if (!this.sessionFresh) this.error = 'El cambio está confirmado, pero no pudimos actualizar tu acceso. Consulta esta misma solicitud otra vez.';
        else { this.error = ''; this.authRequired = false; this.stopUpdates(); this.$nextTick(() => { if (this.$refs.title) this.$refs.title.focus(); }); }
      } finally { if (this.current(controller)) this.sessionRefreshing = false; }
    },
    applySnapshot(snapshot) {
      if (!newerSubscriptionSnapshot(snapshot, this.business.id_business, this.snapshotRevision)) return;
      this.snapshot = snapshot; this.snapshotRevision = snapshot.revision; this.sessionFresh = false;
      this.refreshFromSnapshot();
    },
    refreshFromSnapshot() {
      if (!this.attemptId || !this.snapshotRevision || this.busy || this.metadataRequest || this.metadataRevision === this.snapshotRevision || !this.requestController || !this.canManage) return;
      const controller = this.requestController, revision = this.snapshotRevision; this.metadataRevision = revision;
      const request = {}; this.metadataRequest = request;
      (async () => {
        try {
          const attempt = await Payments.attempt(this.attemptId, controller.signal);
          if (!this.current(controller) || revision !== this.snapshotRevision || this.metadataRequest !== request) return;
          this.adoptAttempt(attempt); if (await this.finishDiscardFromRead(controller)) return; await this.refreshSession(controller); if (this.current(controller)) this.continueAfterPayPalReturn();
        } catch (error) { if (this.current(controller) && this.pendingPayPalId) this.showError(error); }
        finally { if (this.metadataRequest === request) { this.metadataRequest = null; if (this.current(controller) && revision !== this.snapshotRevision) this.refreshFromSnapshot(); } }
      })();
    },
    startUpdates() {
      this.stopUpdates(); if (!this.canManage || !this.attemptId || this.discardCompleted || this.phase === 'active' || this.authRequired || this.recovering) return;
      const controller = this.requestController; if (!controller) return;
      this.closeUpdates = Payments.watchSubscription({ updated: snapshot => { if (this.current(controller)) this.applySnapshot(snapshot); } });
    },
    stopUpdates() { if (this.closeUpdates) this.closeUpdates(); this.closeUpdates = null; },
    // Only the original review click can continue a delayed approval; reloads never restore it.
    continueToPayPal() {
      if (!this.pendingPayPalId || this.pendingPayPalId !== this.attemptId || !this.intent || this.intent.idempotencyKey !== this.pendingPayPalId
        || !this.paypalPopup || this.error || this.authRequired || !this.paymentUrl || !this.requestController || !this.current(this.requestController)) return false;
      this.pendingPayPalId = ''; this.openAuthorization(); return true;
    },
    closePayPalWindow() { if (this.paypalPopup) this.paypalPopup.close(); this.paypalPopup = null; this.openingPayPal = false; this.waitingForPayPalConfirmation = false; },
    reservePayPalWindow() {
      if (this.paypalPopup) return true;
      const owner = this.owner;
      try {
        this.paypalNotice = '';
        this.paypalPopup = openPlanChangePayPal({
          onReturn: async result => {
            this.openingPayPal = false;
            if (this._isDestroyed || owner !== this.owner || result.attemptId !== this.attemptId) return false;
            if (result.result === 'cancelled') {
              this.paypalPopup = null;
              try { window.sessionStorage.removeItem('medsync.plan-change.paypal.' + this.attemptId); } catch (_) { /* No confirmation is sent for a cancelled popup. */ }
              this.paypalNotice = 'No autorizaste el cambio. Puedes continuar con el mismo botón de PayPal.'; this.startUpdates(); return false;
            }
            let approval;
            try { approval = JSON.parse(window.sessionStorage.getItem('medsync.plan-change.paypal.' + this.attemptId)); } catch (_) { /* Only a correlated approval can continue automatically. */ }
            if (!approval || approval.used !== false || approval.owner !== owner || approval.attemptId !== this.attemptId
              || !this.attempt || !['checkoutId', 'subscriptionId', 'planCode', 'planPriceCode'].every(field => this.attempt[field] == null || approval[field] === this.attempt[field])) {
              this.paypalPopup = null; this.returnRecovery = true; return false;
            }
            const controller = this.requestController, creatingId = this.creatingId;
            this.creatingId = this.attemptId;
            try { await this.$router.replace({ name: 'accountPlanChange', query: { attempt_id: this.attemptId, result: 'approved' } }); }
            catch (error) { if (this.current(controller)) this.showError(error); return false; }
            finally { if (this.current(controller)) this.creatingId = creatingId; }
            if (!this.current(controller)) return false;
            await this.continueAfterPayPalReturn();
            return Boolean(!this._isDestroyed && owner === this.owner && this.paypalPopup && !this.error && !this.authRequired);
          },
          onClose: () => {
            this.paypalPopup = null; this.openingPayPal = false; this.waitingForPayPalConfirmation = false; this.pendingPayPalId = '';
            if (!this._isDestroyed && owner === this.owner) this.paypalNotice = 'Cerraste la ventana de PayPal. Puedes abrirla de nuevo para continuar.';
          }
        });
        return true;
      } catch (_) { this.paypalNotice = 'No pudimos abrir PayPal. Permite las ventanas emergentes de MedSync y vuelve a pulsar el botón.'; return false; }
    },
    openPayPal() { if (this.busy || this.loading || this.authRequired || !this.paymentUrl || this.openingPayPal || this.returnContinuing || this.waitingForPayPalConfirmation || !this.reservePayPalWindow()) return; this.openAuthorization(); },
    async openAuthorization() {
      const controller = this.requestController, id = this.attemptId, url = this.paymentUrl;
      if (this.openingPayPal || !this.paypalPopup || !controller || !this.current(controller) || !url) return;
      this.openingPayPal = true;
      try {
        // Clear the previous return before recording another approval of this same attempt.
        if (this.$route.query.result || this.$route.query.token || this.$route.query.ba_token || this.$route.query.PayerID) {
          const creatingId = this.creatingId; this.creatingId = id;
          try { await this.$router.replace({ name: 'accountPlanChange', query: { attempt_id: id, plan_code: this.attempt.planCode, price_code: this.attempt.planPriceCode } }); }
          finally { if (this.current(controller)) this.creatingId = creatingId; }
        }
        if (!this.current(controller) || id !== this.attemptId || url !== this.paymentUrl) return;
        const attempt = this.attempt;
        if (this.discardIntent && !rememberPlanChangeDiscard(id, this.owner, this.discardIntent.planCode ? this.discardIntent : null)) throw { code: 'NETWORK_ERROR' };
        try { window.sessionStorage.setItem('medsync.plan-change.paypal.' + id, JSON.stringify({ owner: this.owner, attemptId: id, checkoutId: attempt.checkoutId, subscriptionId: attempt.subscriptionId, planCode: attempt.planCode, planPriceCode: attempt.planPriceCode, action: this.discardIntent ? 'cancel_change' : this.change.action, approvalHash: SHA256(url).toString(), used: false })); }
        catch (_) { /* A blocked browser store leaves manual recovery available after the return. */ }
        this.paypalPopup.navigate(url, id);
      } catch (error) { if (this.current(controller)) this.showError(error); }
    },
    continuePopupPayment(action) {
      if (!this.paypalPopup || this.error || this.authRequired || action !== 'approve_subscription' || !this.change || this.change.action !== 'approve_payment') return false;
      this.waitingForPayPalConfirmation = false;
      this.intent = Object.freeze({ idempotencyKey: this.attemptId, planCode: this.attempt.planCode, planPriceCode: this.attempt.planPriceCode });
      this.pendingPayPalId = this.attemptId;
      this.continueToPayPal();
      return true;
    },
    async continueAfterPayPalReturn(result = this.$route.query.result) {
      if (this.loading || this.busy || this.openingPayPal || this.returnContinuing || !this.canManage || this.authRequired || this.error || !this.attempt || !['approved', 'cancelled'].includes(result)) return;
      const controller = this.requestController, key = 'medsync.plan-change.paypal.' + this.attemptId;
      if (!controller || !this.current(controller)) return;
      let record;
      try { record = JSON.parse(window.sessionStorage.getItem(key)); } catch (_) { /* No browser marker can authorize an automatic continuation. */ }
      if (!record) { this.returnRecovery = result === 'approved'; return; }
      if (typeof record.used !== 'boolean' || !['approve_subscription', 'approve_payment', 'cancel_change'].includes(record.action) || !/^[a-f0-9]{64}$/.test(record.approvalHash || '') || record.owner !== this.owner || !['attemptId', 'checkoutId', 'subscriptionId', 'planCode', 'planPriceCode'].every(field => record[field] === this.attempt[field])) return;
      if (result === 'cancelled') {
        if (!record.used && record.action === 'approve_subscription' && !this.discardIntent && this.canDiscardAttempt && (!this.change.checkoutUrl || record.approvalHash === SHA256(this.paymentUrl).toString())) {
          try { window.sessionStorage.setItem(key, JSON.stringify({ ...record, used: true })); } catch (_) { return; }
          await this.discardChange();
        } else { try { window.sessionStorage.removeItem(key); } catch (_) { /* Keep manual recovery if browser storage is unavailable. */ } }
        return;
      }
      if (this.attempt.status !== 'ready') return;
      const cancelReturn = record.action === 'cancel_change' && this.discardIntent && this.change && this.change.cancellationRequested;
      const matchingApproval = (cancelReturn || this.canConfirm && record.action === this.change.action) && (!this.change.checkoutUrl || record.approvalHash === SHA256(this.paymentUrl).toString());
      if (record.used) {
        if (this.waitingForPayPalConfirmation && this.paypalPopup) {
          if (this.continuePopupPayment(record.action)) return;
          if (this.closed || this.attempt.status === 'rejected' || this.change && ['effective', 'scheduled', 'failed'].includes(this.change.state)) this.closePayPalWindow();
          return;
        }
        this.returnRecovery = Boolean(matchingApproval); return;
      }
      // Consume before the POST: a reload or an uncertain response must not repeat it.
      try { window.sessionStorage.setItem(key, JSON.stringify({ ...record, used: true })); }
      catch (_) { this.returnRecovery = true; return; }
      if (!matchingApproval) { if (!this.continuePopupPayment(record.action)) this.closePayPalWindow(); return; }
      this.returnContinuing = true;
      try { if (cancelReturn) await this.discardChange(); else await this.confirmApproval(); }
      finally {
        if (!this._isDestroyed && record.owner === this.owner) {
          this.returnContinuing = false; this.returnRecovery = Boolean(this.error || this.canConfirm && record.action === this.change.action);
          if (!this.continuePopupPayment(record.action)) {
            this.waitingForPayPalConfirmation = Boolean(this.paypalPopup && !this.error && !this.authRequired && !this.closed && this.attempt.status !== 'rejected' && !(this.change && ['effective', 'scheduled', 'failed'].includes(this.change.state)));
            if (this.waitingForPayPalConfirmation) this.returnRecovery = false;
            else this.closePayPalWindow();
          }
        }
      }
    },
    async returnToMedsync() {
      if (!this.canReturnToMedsync || this.completionRedirected) return;
      this.completionRedirected = true; this.stopUpdates();
      const controller = this.requestController;
      try { await this.$router.replace({ name: 'home' }); }
      catch (_) { if (this.current(controller)) { this.completionRedirected = false; this.error = 'El cambio está confirmado. No pudimos volver a MedSync automáticamente.'; } }
    },
    async leave() {
      if (this.busy || this.openingPayPal || this.returnContinuing || this.waitingForPayPalConfirmation) return;
      this.pendingPayPalId = '';
      if (this.canDiscardAttempt) { await this.discardChange(); return; }
      this.$router.push(!this.canManage || ['active', 'scheduled'].includes(this.phase) ? { name: 'home' } : { name: 'admin', query: { section: 'plan-billing' } });
    },
    async discardChange(navigate = true) {
      if (!this.canManage || !this.attemptId || this.busy || this.openingPayPal) return false;
      const id = this.attemptId;
      if (!this.discardIntent) {
        if (!rememberPlanChangeDiscard(id, this.owner)) { this.showError({ code: 'NETWORK_ERROR' }); return false; }
        this.discardIntent = loadPlanChangeDiscard(id, this.owner);
      }
      const controller = this.controller(); this.busy = true; this.error = ''; this.pendingPayPalId = ''; this.stopUpdates();
      try {
        try { window.sessionStorage.removeItem('medsync.plan-change.paypal.' + id); } catch (_) { /* Never resume an approval while discarding it. */ }
        if (this.missingAttempt && !this.attempt) {
          try { if (await this.readAttempt(controller, navigate)) return true; }
          catch (lookup) { if (lookup.status === 404 || lookup.code === 'PAYMENT_NOT_FOUND') { if (await this.finishMissingDiscard(controller, navigate)) return true; } else throw lookup; }
        }
        const result = await Payments.cancel(id, controller.signal);
        if (!this.current(controller)) return false;
        if (!result || typeof result.cancelled !== 'boolean') throw { code: 'PAYMENT_INVALID_RESPONSE' };
        if (result.cancelled) { this.discardCompleted = true; await this.finishDiscard(controller, navigate); return true; }
        return await this.readAttempt(controller, navigate) || false;
      } catch (error) {
        if (this.current(controller)) {
          if (error.code === 'PLAN_CHANGE_ALREADY_AUTHORIZED') { forgetPlanChangeDiscard(id); this.discardIntent = null; }
          this.showError(error);
          try { if (await this.readAttempt(controller, navigate)) return true; }
          catch (lookup) { if (lookup.status === 404 || lookup.code === 'PAYMENT_NOT_FOUND') { try { if (await this.finishMissingDiscard(controller, navigate)) return true; } catch (_) { /* Keep an uncertain cancellation visible. */ } } }
        }
        return false;
      } finally { if (this.current(controller)) { this.busy = false; this.startUpdates(); } }
    },
    async finishDiscardFromRead(controller, navigate = true) {
      if (!this.discardIntent || !cancelledPlanChange(this.attempt) || !this.current(controller)) return false;
      const source = await Payments.subscription(controller.signal);
      if (!this.current(controller)) return false;
      if (!this.validSource(source) || source.id !== this.attempt.subscriptionId || source.pendingPlanChange && source.pendingPlanChange.state !== 'failed') throw { code: 'PAYMENT_CONFLICT' };
      this.source = source; this.discardCompleted = true; this.error = ''; await this.finishDiscard(controller, navigate); return true;
    },
    async finishMissingDiscard(controller, navigate) {
      if (!this.current(controller) || !this.discardIntent) return false;
      const source = await Payments.subscription(controller.signal);
      if (!this.current(controller)) return false;
      if (source !== null && (!this.validSource(source) || source.pendingPlanChange && ['preparing', 'awaiting_approval', 'scheduled'].includes(source.pendingPlanChange.state))) return false;
      this.source = source; this.discardCompleted = true; this.error = ''; await this.finishDiscard(controller, navigate); return true;
    },
    async finishDiscard(controller, navigate = true) {
      if (!this.current(controller) || !this.discardCompleted || !this.discardIntent) return;
      const intent = this.discardIntent; forgetPlanChangeDiscard(this.attemptId);
      try { window.sessionStorage.removeItem('medsync.plan-change.paypal.' + this.attemptId); } catch (_) { /* No return marker is needed for a discarded attempt. */ } this.discardIntent = null; this.stopUpdates();
      if (!navigate) return;
      await this.$router.replace(intent.planCode ? { name: 'accountPlanChange', query: { plan_code: intent.planCode, price_code: intent.planPriceCode } } : { name: 'admin', query: { section: 'plan-billing' } });
    },
    login() { this.$router.push(checkoutLoginRoute(this.attemptId, 'change_plan')); },
    amount(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(value)); },
    dateLabel(value) { return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : 'Por confirmar'; },
    async openDocument(doc, event) { if (this.busy || !this.documents.some(item => item.documentVersionId === doc.documentVersionId && item.contentHash === doc.contentHash)) return; this.documentTrigger = event && event.currentTarget; this.selectedDocument = doc; this.legalOpen = true; await this.$nextTick(); const title = this.$refs.legalTitle, dialog = title && title.closest('[role="dialog"]'); if (this.legalOpen && dialog) { dialog.setAttribute('aria-labelledby', title.id); title.focus(); } },
    closeDocument() { this.legalOpen = false; this.restoreDocumentFocus(false); },
    restoreDocumentFocus(open) { if (open) return; const trigger = this.documentTrigger; this.$nextTick(() => { if (this.legalOpen || this._isDestroyed) return; this.selectedDocument = null; if (trigger && trigger.isConnected) trigger.focus(); }); this.documentTrigger = null; },
    preventDocumentNavigation(event) { if (event.target.closest('a')) event.preventDefault(); }
  }
};
</script>
<style scoped>
.plan-change-page { display:flex; align-items:center; justify-content:center; min-height:100vh; min-height:100dvh; background:var(--color-gray98); }
.plan-change-page::before,.plan-change-page::after,.plan-change-page ::v-deep .auth-visual-panel { display:none; }
.plan-change-page ::v-deep .auth-card-panel { min-height:100vh; min-height:100dvh; padding:28px 20px; }
.plan-change-page ::v-deep .auth-card-panel .auth-card { position:relative; width:100%; max-width:640px; padding:30px; border:1px solid var(--auth-border); border-radius:18px; box-shadow:0 14px 44px rgba(18,41,74,.08); }
.plan-change-page ::v-deep .auth-card .login-form,.change-content { position:static; color:var(--color-primary-900); }
.change-close.v-btn { position:absolute; top:16px; right:16px; z-index:2; width:44px; min-width:44px; height:44px; margin:0; color:var(--color-grey); }
.change-heading { text-align:center; }.change-heading h1 { margin:0; font-size:clamp(23px,3vw,28px); font-weight:700; line-height:1.25; letter-spacing:-.025em; }.change-heading h1:focus { outline:none; }
.change-heading p,.change-note { color:var(--color-grey); font-size:13px; line-height:1.65; }.change-heading p { margin:12px auto 0; max-width:470px; }
.change-symbol { position:relative; display:grid; place-items:center; width:70px; height:70px; border-radius:50%; margin:0 auto 20px; background:var(--color-primary-100); color:var(--color-primary-700); }.change-symbol .v-icon { color:inherit; font-size:32px; }
.change-symbol--working::before { content:''; position:absolute; inset:-6px; border:2px solid var(--color-primary-100); border-top-color:var(--color-primary-700); border-radius:50%; animation:change-rotate 1.15s linear infinite; }
@keyframes change-rotate { to { transform:rotate(360deg); } }
@media(prefers-reduced-motion:reduce) { .change-symbol--working::before { animation:none; } }
.change-summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px 22px; padding:20px 0; margin:24px 0 0; border-block:1px solid var(--auth-border); }.change-summary>div { min-width:0; }.change-summary>div:first-child { grid-column:1/-1; }
.change-summary dt { font-size:12px; color:var(--color-grey); line-height:1.5; margin-bottom:4px; }.change-summary dd { font-size:19px; font-weight:600; margin:0; overflow-wrap:anywhere; }.change-summary small { font-size:11px; font-weight:400; color:var(--color-grey); }.change-summary .change-date { font-size:13px; font-weight:500; line-height:1.5; }
.change-note { margin:18px 0 0; }.change-loading { font-size:14px; text-align:center; margin:24px 0; }.change-alert { border-radius:9px; padding:13px 15px; margin:20px 0 0; background:var(--color-primary-100); color:var(--color-primary-900); font-size:13px; line-height:1.6; }
.change-actions { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:10px; margin-top:22px; }.change-actions .v-btn { min-height:46px; height:auto; padding:12px 18px; border-radius:10px; text-transform:none; letter-spacing:0; white-space:normal; font-size:13px; }.change-actions .v-btn ::v-deep .v-btn__content { white-space:normal; }.change-primary { background:var(--color-primary-700)!important; color:var(--color-surface)!important; }.change-actions .v-icon { color:inherit; }
.change-paypal-button { display:inline-flex; align-self:center; align-items:center; justify-content:center; width:228px; max-width:100%; min-height:46px; padding:0; border:0; border-radius:4px; background:transparent; cursor:pointer; }
.change-paypal-button img { display:block; width:100%; height:auto; }
.change-paypal-button:disabled { opacity:.5; cursor:not-allowed; }
.change-paypal-button:not(:disabled):hover { filter:brightness(.96); }
.change-legal { border:0; margin:20px 0 0; padding:0; }.change-legal legend { font-size:14px; font-weight:600; margin-bottom:8px; }.change-document { padding:8px 0; }.change-document ::v-deep .v-input--checkbox { margin:0; padding:0; }.change-document ::v-deep .v-label { font-size:13px; line-height:1.5; }.change-document-link { min-height:40px; color:var(--auth-link); font-size:13px; text-align:left; text-decoration:underline; }
.change-legal-dialog.v-card { background:var(--color-surface); border-radius:14px; max-height:86vh; max-height:86dvh; }.change-document-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:20px 24px; border-bottom:1px solid var(--auth-border); }.change-document-heading h2 { margin:0; font-size:21px; line-height:1.35; overflow-wrap:anywhere; }.change-document-heading .v-btn { margin:0; flex-shrink:0; }.change-document-body { padding:20px 24px!important; font-size:14px; line-height:1.65; overflow-wrap:anywhere; }.change-document-body ::v-deep table { display:block; max-width:100%; overflow-x:auto; }
.change-content button:focus-visible,.change-content a:focus-visible { outline:3px solid var(--auth-focus); outline-offset:3px; }
@media(max-width:600px) { .plan-change-page ::v-deep .auth-card-panel { padding:20px 12px; }.plan-change-page ::v-deep .auth-card-panel .auth-card { padding:28px 20px; }.change-actions { flex-direction:column; align-items:stretch; }.change-actions .v-btn { width:100%; }.change-summary { gap:16px; }.change-summary dd { font-size:17px; }.change-document-heading,.change-document-body { padding:16px!important; } }
</style>
