<template>
  <account-flow-shell class="payment-page" :class="{ 'payment-page--checkout': attemptId && !recovering }" wide :step="onboardingChoice && !attemptId ? 3 : 0" title-id="account-plans-title">
    <div class="payment-content">
      <nav v-if="attemptId && !recovering && !accessConfirmed" class="payment-checkout-navigation" aria-label="Salir del pago">
        <v-btn icon aria-label="Cerrar y volver a MedSync" title="Volver a MedSync" :disabled="leaving || busy || loading" @click="continuePending"><v-icon aria-hidden="true">mdi-close</v-icon></v-btn>
      </nav>
      <header v-if="(!attemptId || recovering) && !accessConfirmed" class="payment-header">
        <div><p class="payment-context">{{ businessName }}</p><h1 id="account-plans-title" ref="title" tabindex="-1">{{ onboardingChoice ? 'Tu cuenta está lista' : 'Planes y suscripción' }}</h1><p v-if="onboardingChoice" class="payment-subtitle">Elige cómo comenzar en MedSync.</p></div>
        <v-btn v-if="!onboardingChoice" text :disabled="busy || loading" @click="continueToMedsync">Volver a MedSync</v-btn>
      </header>
      <p v-if="!canManage" class="payment-alert" role="alert">Sólo una cuenta administradora del consultorio puede contratar un plan.</p>
      <template v-else>
        <div v-if="error" ref="alert" class="payment-alert" role="alert" tabindex="-1">{{ error }}
          <v-btn v-if="authRequired" text :disabled="busy" @click="resumeLogin">Iniciar sesión para retomar</v-btn>
          <v-btn v-if="pendingAttemptRoute" text :to="pendingAttemptRoute" :disabled="busy">Abrir solicitud en proceso</v-btn>
        </div>
        <section v-if="onboardingChoice && !attemptId && !confirmed" class="payment-trial" aria-labelledby="trial-choice-title">
          <div class="payment-trial-main"><div><h2 id="trial-choice-title">Comienza con tu prueba gratis</h2><p>Profesional hasta el {{ trialEndLabel }}. Sin tarjeta.</p></div></div>
          <v-btn class="payment-primary-button" depressed :disabled="busy || loading" @click="continueFree">Continuar gratis</v-btn>
          <p v-if="attemptId" class="payment-hint payment-trial-note">Tu solicitud de pago se conserva para que puedas retomarla.</p>
        </section>
        <template v-if="attemptId && !recovering">
          <section class="payment-panel payment-focus" :class="accessConfirmed ? 'payment-success' : 'payment-status'" :data-payment-state="paymentPhase" aria-labelledby="account-plans-title" :aria-busy="paymentAnimating ? 'true' : 'false'">
            <div class="payment-focus-heading" role="status" aria-live="polite" aria-atomic="true">
              <div class="payment-orb" :class="{ 'payment-status-motion': paymentAnimating, 'payment-orb--complete': accessConfirmed }" aria-hidden="true"><span class="payment-orbit" /><transition name="payment-symbol" mode="out-in"><v-icon :key="paymentIcon">{{ paymentIcon }}</v-icon></transition></div>
              <p v-if="paymentKicker" class="payment-kicker">{{ paymentKicker }}</p>
              <h1 id="account-plans-title" ref="title" tabindex="-1">{{ paymentHeading }}</h1>
              <p class="payment-status-copy">{{ paymentCopy }}</p>
            </div>
            <ol v-if="showPaymentProgress" class="payment-progress" aria-label="Progreso de la contratación">
              <li v-for="(label, index) in ['Confirmación', 'Activación', 'Listo']" :key="label" :class="{ complete: accessConfirmed || confirmed && index === 0 }" :aria-current="!accessConfirmed && index === (confirmed ? 1 : 0) ? 'step' : null"><span class="payment-step-mark" aria-hidden="true"><v-icon v-if="accessConfirmed || confirmed && index === 0" small>mdi-check</v-icon><template v-else>{{ index + 1 }}</template></span><span>{{ label }}</span></li>
            </ol>
            <div class="payment-success-body">
              <dl v-if="requestedPlanName || confirmation" class="payment-success-receipt payment-status-summary">
                <div v-if="requestedPlanName || confirmation"><dt>Plan del consultorio</dt><dd>{{ confirmed ? paidPlanName : requestedPlanName }}</dd></div>
                <div v-if="confirmation || requestedOffer"><dt>{{ confirmation ? 'Total pagado' : requestedPriceLabel }}</dt><dd class="payment-success-amount">{{ confirmation ? confirmation.paidAmount : requestedOffer.price.amount }} <span>{{ confirmation ? confirmation.currency : requestedOffer.price.currency }}</span></dd></div>
              </dl>
              <div v-if="confirmation" class="payment-confirmed-details"><span>Pago con PayPal</span><span v-if="nextBillingLabel">{{ nextBillingLabel }}</span></div>
              <p v-if="!showProviderResume" class="payment-success-business">{{ businessName }}</p>
              <div v-if="accessConfirmed" class="payment-success-actions"><v-btn class="payment-primary-button payment-success-continue" depressed :disabled="busy" @click="continueToMedsync">Continuar a MedSync<v-icon right aria-hidden="true">mdi-arrow-right</v-icon></v-btn></div>
              <div v-else-if="!preparingProvider && !authRequired" class="payment-status-actions">
                <v-btn v-if="(!updatesOpen || exceptional || canRetry || accountError) && (!showProviderResume || !approval)" text :disabled="busy || loading || retryRemaining > 0" @click="consult">{{ retryRemaining > 0 ? 'Actualizar en ' + retryRemaining + ' s' : 'Actualizar estado' }}</v-btn>
                <v-btn v-if="!missingAttempt && (!showProviderResume || !approval)" :class="showProviderResume ? '' : 'payment-primary-button'" :outlined="showProviderResume" depressed :disabled="leaving || ((busy || loading) && !confirmed)" @click="continuePending">Continuar a MedSync</v-btn>
                <v-btn v-if="missingAttempt" class="payment-primary-button" depressed :disabled="busy || loading" @click="recoverMissing">Recuperar solicitud</v-btn>
                <template v-if="showProviderResume && !paypalOpening">
                  <button v-if="!approval" type="button" class="payment-paypal-button payment-paypal-fallback" aria-label="Continuar con PayPal" :disabled="busy || loading || paypalOpening" @click="openPayPal"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" width="228" height="44" alt="Continuar con PayPal"></button>
                  <paypal-button v-else-if="paypalReady" type="subscribe" class="paypal-gold payment-paypal-button" :disabled.prop="busy || loading || paypalOpening" @click="openPayPal"></paypal-button>
                  <v-btn v-else outlined :disabled="busy || loading || paypalLoading" @click="preparePayPal">{{ paypalLoading ? 'Cargando PayPal…' : 'Volver a cargar PayPal' }}</v-btn>
                </template>
              </div>
              <p v-if="showProviderResume" class="payment-footnote">Puedes volver a MedSync y retomar esta solicitud más tarde.</p>
              <p v-if="confirmation" class="payment-success-terms">{{ recurringLabel }}</p>
              <p v-else-if="awaitingConfirmation && !exceptional && !closedCheckout" class="payment-footnote">No necesitas realizar otro pago.</p>
            </div>
            <details v-if="!accessConfirmed && exceptional && !authRequired && canRetry" class="payment-recovery">
              <summary>Opciones de recuperación</summary>
              <div class="payment-actions"><v-btn outlined :disabled="busy || loading || retryRemaining > 0" @click="operate('retry')">Reintentar preparación</v-btn></div>
            </details>
          </section>
        </template>
        <p v-else-if="loading" role="status">Cargando planes y condiciones…</p>
        <template v-else-if="!invalidAttempt">
          <p v-if="recovering" class="payment-alert" role="status">Revisa el plan y sus condiciones. Conservaremos la misma solicitud; si ya existe, recuperaremos su estado.</p>
          <section v-if="!offersAvailable" class="payment-panel"><h2>Planes no disponibles</h2><p>No pudimos consultar los planes vigentes.</p><v-btn outlined :disabled="busy" @click="initialize">Volver a consultar planes</v-btn></section>
          <template v-else>
            <p v-if="!catalog.checkoutAvailable" class="payment-alert" role="status">Puedes consultar los planes. La contratación no está disponible por el momento.</p>
            <plan-catalog v-if="!selection" :catalog-data="catalog" :selectable="catalog.checkoutAvailable" :disabled="busy" @select="selectPlan" />
            <section v-else class="payment-panel" aria-labelledby="selected-plan-title" :aria-busy="busy ? 'true' : 'false'">
              <div class="payment-header"><div><h2 id="selected-plan-title">{{ selection.name }}</h2><p>{{ selectedPrice }} · IVA incluido</p></div><v-btn text :disabled="busy" @click="clearSelection">Cambiar plan</v-btn></div>
              <fieldset v-if="documents.length" class="payment-legal" :class="{ 'payment-legal-accepted': allDocumentsAccepted }" :disabled="busy || legalSent"><legend>Condiciones del plan</legend>
                <div v-for="doc in documents" :key="doc.documentVersionId" class="payment-document" :class="{ 'payment-document-accepted': doc.acceptedInRegistration }">
                  <v-checkbox v-if="!doc.acceptedInRegistration" :id="'payment-legal-' + doc.documentVersionId" v-model="accepted[doc.documentVersionId]" color="var(--color-primary-700)" hide-details class="remember-checkbox" :disabled="busy || legalSent">
                    <template v-slot:label><span>{{ documentConfirmation(doc) }}</span></template>
                  </v-checkbox>
                  <button class="payment-document-link" type="button" :aria-label="'Leer ' + doc.title" :disabled="busy" @click="openDocument(doc, $event)">{{ doc.acceptedInRegistration ? doc.title : 'Ver documento' }}</button>
                </div>
              </fieldset>
              <div v-else class="payment-alert" role="status">{{ legalLoading ? 'Cargando condiciones…' : 'No pudimos cargar las condiciones vigentes.' }}<v-btn v-if="!legalLoading" text :disabled="busy" @click="refreshLegal">Volver a cargar condiciones</v-btn></div>
              <div class="payment-actions payment-plan-actions"><button v-if="documents.length" type="button" class="payment-paypal-button payment-paypal-fallback" aria-label="Continuar con PayPal" :aria-busy="busy ? 'true' : 'false'" :disabled="!canCreate" @click="createCheckout"><img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png" width="228" height="44" alt="Continuar con PayPal"></button></div>
            </section>
          </template>
        </template>
      </template>
    </div>
    <v-dialog v-model="legalOpen" width="calc(100% - 24px)" max-width="720" scrollable @input="restoreLegalFocus">
      <v-card v-if="selectedDocument" class="flow-legal payment-legal-dialog">
        <header class="payment-document-header"><div><h2 id="payment-legal-title" ref="legalTitle" tabindex="-1">{{ selectedDocument.title }}</h2><p v-if="selectedDocument.version" class="payment-hint">Versión {{ selectedDocument.version }}</p></div><v-btn icon type="button" aria-label="Cerrar documento" @click="closeDocument"><v-icon aria-hidden="true">mdi-close</v-icon></v-btn></header>
        <v-card-text :key="selectedDocument.documentVersionId" class="payment-document-body" tabindex="0" role="region" aria-label="Contenido del documento" @click="preventDocumentNavigation" v-html="legalHtml" />
      </v-card>
    </v-dialog>
  </account-flow-shell>
</template>
<script>
import DOMPurify from 'dompurify';
import { openPlanChangePayPal as openPayPalWindow, returnFromPlanChangePayPal as returnFromPayPalWindow } from '../../domain/billing/planChangePayPal';
import { paypalApproval, preparePayPalApproval } from '../../domain/billing/paypalApproval';
import { newerSubscriptionSnapshot } from '../../domain/billing/subscriptionUpdates';
import AccountFlowShell from './AccountFlowShell.vue';
import Payments from '../../services/core/billing/DAPaymentsService';
import Registration from '../../services/core/auth/DARegistrationService';
import { activationDestination, trialChoiceEligible } from '../../utils/activationDestination';
import PlanCatalog from '../../components/billing/PlanCatalog.vue';
import { registrationAttemptId } from '../../utils/registration';
import { checkoutAttemptId, checkoutLoginRoute, canManageCheckout, usableOffers, selectedOffer, legalDocuments, usableAttempt, safePaymentUrl, checkoutConfirmation, paymentConfirmed, paidSessionApplied, paymentErrorMessage } from '../../domain/billing/checkout';

export default {
  components: { AccountFlowShell, PlanCatalog },
  data: () => ({ catalog: null, activation: null, selection: null, checkoutKey: '', missingAttempt: false, recovering: false, prepared: null, accepted: {}, legalKey: '', legalAcceptanceId: '', legalSent: false, frozenConfirmations: null, legalLoading: false, legalOpen: false, selectedDocument: null, attempt: null, subscription: null, license: null, authorityKnown: false, sessionFresh: false, accountError: '', loading: true, busy: false, creating: false, creatingKey: '', error: '', authRequired: false, retryAt: 0, now: Date.now(), timer: null, requestController: null, paypalLoading: false, paypalReady: false, paypalOpening: false, paypalApproved: false, paypalNotice: '', snapshotRevision: '', redirectIntent: '', redirectDone: false, confirmationReads: 0, updatesOpen: false, waitingSince: 0, leaving: false }),
  computed: {
    business() { return this.$store.getters['CORE/AUTH/getBusiness'] || {}; },
    buyer() { const user = this.$store.getters['CORE/AUTH/getUser'] || {}; return { organizationId: this.business.id_business, userId: user.id_login }; },
    checkoutOwner() { const user = this.$store.getters['CORE/AUTH/getUser'] || {}; return JSON.stringify([this.business.id_business, user.id_login, user.id_session, this.$store.getters['CORE/AUTH/getRole']]); },
    onboardingChoice() { return (this.business.subscriptionStatus || this.business.subscription_status) !== 'active' && trialChoiceEligible(this.activation, this.now); },
    paidPlanName() { const plan = this.catalog && Array.isArray(this.catalog.offers) && this.catalog.offers.find(item => item.code === (this.license && this.license.planCode)); return plan ? plan.name : 'contratado'; },
    confirmation() { return this.confirmed ? checkoutConfirmation(this.license) : null; },
    recurringLabel() { const proof = this.confirmation; if (!proof) return ''; const units = proof.billingInterval === 'year' ? ['año', 'años'] : ['mes', 'meses']; return 'Precio del plan: ' + proof.recurringAmount + ' ' + proof.currency + ' por ' + (proof.billingIntervalCount === 1 ? units[0] : proof.billingIntervalCount + ' ' + units[1]); },
    nextBillingLabel() { const next = this.confirmation && this.confirmation.nextBillingAt; const subscription = this.subscription; return next && Date.parse(next) > this.now && subscription && Date.parse(subscription.nextBillingTime) === Date.parse(next) && !subscription.cancelAtPeriodEnd && !subscription.cancellation && !subscription.cancelledAt ? 'Próxima renovación: ' + this.dateLabel(next) : ''; },
    providerActive() { return Boolean(usableAttempt(this.attempt, this.attemptId) && (this.attempt.subscriptionStatus === 'active' || this.subscription && this.subscription.id === this.attempt.subscriptionId && this.subscription.status === 'active')); },
    providerUnavailable() { return Boolean(this.subscription && this.attempt && this.attempt.subscriptionId && this.subscription.id === this.attempt.subscriptionId && this.subscription.status !== 'pending'); },
    closedCheckout() { return this.providerUnavailable && this.subscription.status !== 'active'; },
    accessConfirmed() { return this.confirmed && this.sessionFresh && paidSessionApplied(this.business, this.license, this.$store.getters['CORE/AUTH/getTenantOperational'], this.now); },
    trialEndLabel() { return this.onboardingChoice ? this.dateLabel(this.activation.trialEndsAt) : ''; },
    businessName() { return this.business.name || 'Consultorio actual'; },
    pendingAttemptRoute() { const id = checkoutAttemptId(this.subscription && this.subscription.pendingCheckoutAttemptId); return id && id !== this.attemptId ? { name: 'accountPlans', query: { attempt_id: id } } : null; },
    canManage() { return canManageCheckout(this.$store.getters['CORE/AUTH/getRole']); },
    attemptId() { return checkoutAttemptId(this.$route.query.attempt_id); },
    invalidAttempt() { return Boolean(this.$route.query.attempt_id && !this.attemptId); },
    loginRoute() { return checkoutLoginRoute(this.attemptId); },
    offersAvailable() { return usableOffers(this.catalog); },
    documents() { return legalDocuments(this.prepared, this.now); },
    legalHtml() { return DOMPurify.sanitize(this.selectedDocument ? this.selectedDocument.contentHtml : '', { ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'], ALLOWED_ATTR: ['href', 'colspan', 'rowspan'], ALLOW_DATA_ATTR: false }); },
    selectedPrice() { if (!this.selection) return ''; const price = this.selection.price; const units = price.billingInterval === 'year' ? ['año', 'años'] : ['mes', 'meses']; return price.currency + ' $' + price.amount + ' / ' + (price.billingIntervalCount === 1 ? units[0] : price.billingIntervalCount + ' ' + units[1]); },
    retryRemaining() { return Math.max(0, Math.ceil((this.retryAt - this.now) / 1000)); },
    canRetry() { return Boolean(usableAttempt(this.attempt, this.attemptId) && ['pending', 'processing'].includes(this.attempt.status)); },
    canCreate() { return Boolean(!this.busy && !this.loading && (!this.attemptId || this.recovering && this.missingAttempt) && this.selection && this.catalog && this.catalog.checkoutAvailable === true && this.documents.length && this.documents.every(doc => doc.acceptedInRegistration || this.accepted[doc.documentVersionId] === true)); },
    checkoutUrl() { return !this.providerActive && !this.providerUnavailable && usableAttempt(this.attempt, this.attemptId) && this.attempt.status === 'ready' ? safePaymentUrl(this.attempt.checkoutUrl) : ''; },
    confirmed() { return usableAttempt(this.attempt, this.attemptId) && this.authorityKnown && Boolean(this.buyer.organizationId) && paymentConfirmed(this.attempt, this.subscription, this.license, this.now, this.buyer); },
    exceptional() { return Boolean(this.error || this.accountError || this.missingAttempt || this.attempt && this.attempt.status === 'rejected'); },
    cancelledReturn() { return this.$route.query.result === 'cancelled'; },
    allDocumentsAccepted() { return this.documents.length > 0 && this.documents.every(doc => doc.acceptedInRegistration); },
    preparingProvider() { return Boolean(this.creating || this.redirectIntent); },
    statusWorking() { return Boolean(this.loading || this.busy || this.preparingProvider && !this.exceptional); },
    requestedPlanName() { const code = this.attempt && this.attempt.planCode || this.selection && this.selection.planCode; const plan = this.catalog && this.catalog.offers && this.catalog.offers.find(item => item.code === code); return plan ? plan.name : ''; },
    approval() { return this.attempt && this.attempt.status === 'ready' && !this.providerActive && !this.providerUnavailable && !this.confirmed ? paypalApproval(this.attempt.paypalApproval) : null; },
    streamCredential() { const auth = this.$store.state && this.$store.state.CORE.AUTH || {}; return JSON.stringify([auth.accessExpiresAt, auth.token, auth.accessRevision, auth.permissions]); },
    awaitingConfirmation() { return this.paypalApproved || this.$route.query.result === 'approved' || this.providerActive; },
    showProviderResume() { return Boolean(this.checkoutUrl && !this.confirmed && !this.awaitingConfirmation); },
    requestedOffer() { return this.attempt ? selectedOffer(this.catalog, this.attempt.planCode, this.attempt.planPriceCode) : this.selection; },
    requestedPriceLabel() { if (!this.requestedOffer) return ''; const price = this.requestedOffer.price; const units = price.billingInterval === 'year' ? ['año', 'años'] : ['mes', 'meses']; return 'Precio del plan por ' + (price.billingIntervalCount === 1 ? units[0] : price.billingIntervalCount + ' ' + units[1]); },
    confirmationDelayed() { return Boolean(this.waitingSince && this.now - this.waitingSince >= 60000 && !this.confirmed); },
    paymentPhase() {
      if (this.accessConfirmed) return 'active';
      if (this.authRequired || this.exceptional || this.accountError || this.closedCheckout) return 'attention';
      if (this.confirmed) return 'applying';
      if (this.preparingProvider || this.canRetry) return 'preparing';
      if (this.awaitingConfirmation || this.providerActive || !this.checkoutUrl) return this.confirmationDelayed ? 'delayed' : 'pending';
      if (this.paypalOpening) return 'paypal';
      return this.cancelledReturn || this.paypalNotice ? 'resume' : 'ready';
    },
    paymentAnimating() { return ['pending', 'applying', 'preparing'].includes(this.paymentPhase); },
    showPaymentProgress() { return ['pending', 'delayed', 'applying', 'active'].includes(this.paymentPhase); },
    paymentIcon() { return { active: 'mdi-check', applying: 'mdi-layers-outline', pending: 'mdi-shield-check-outline', preparing: 'mdi-credit-card-outline', delayed: 'mdi-clock-outline', paypal: 'mdi-open-in-new', ready: 'mdi-credit-card-outline', resume: 'mdi-credit-card-outline', attention: 'mdi-information-outline' }[this.paymentPhase]; },
    paymentKicker() { return this.accessConfirmed ? 'Todo listo' : this.confirmed ? 'Pago confirmado' : this.paymentPhase === 'attention' ? 'Revisa tu solicitud' : this.awaitingConfirmation ? 'Confirmación en curso' : this.showProviderResume ? '' : 'Suscripción del consultorio'; },
    paymentHeading() {
      if (this.accessConfirmed) return 'Tu plan ya está activo';
      if (this.paymentPhase === 'applying') return 'Estamos activando tu plan';
      if (this.paymentPhase === 'delayed') return 'La confirmación está tardando';
      if (this.paymentPhase === 'pending') return 'Estamos confirmando tu pago';
      return this.statusTitle;
    },
    paymentCopy() {
      if (this.accessConfirmed) return 'Ya puedes utilizar las funciones de tu plan en MedSync.';
      if (this.paymentPhase === 'applying') return 'Estamos preparando el acceso a las funciones de tu consultorio.';
      if (this.paymentPhase === 'delayed') return 'Tu solicitud se conserva. Puedes continuar a MedSync mientras recibimos la confirmación.';
      if (this.paymentPhase === 'pending') return 'En cuanto recibamos la confirmación de PayPal, activaremos tu plan automáticamente.';
      return this.accountError || this.attemptMessage;
    },
    statusTitle() {
      if (this.authRequired) return 'Retoma tu suscripción';
      if (this.missingAttempt) return 'Recupera tu solicitud';
      if (this.closedCheckout) return 'Esta solicitud ya no está vigente';
      if (this.attempt && this.attempt.status === 'rejected') return 'No pudimos preparar tu pago';
      if (this.exceptional) return this.confirmed ? 'Tu pago está confirmado' : 'No pudimos actualizar tu suscripción';
      if (this.preparingProvider || this.canRetry) return 'Preparando tu pago';
      if (this.paypalApproved) return 'Confirmando tu pago';
      if (this.paypalOpening) return 'Completa tu pago en PayPal';
      if (this.checkoutUrl) return 'Para continuar, completa tu pago en PayPal';
      if (this.confirmed) return 'Completando tu suscripción';
      if (this.statusWorking || !this.authorityKnown) return this.cancelledReturn ? 'Revisando tu suscripción' : 'Estamos procesando tu pago';
      if (this.cancelledReturn && !this.providerActive) return 'Puedes retomar tu suscripción';
      return 'Estamos procesando tu pago';
    },
    attemptMessage() {
      if (this.authRequired) return 'Inicia sesión para continuar con esta misma solicitud.';
      if (this.closedCheckout) return 'La suscripción vinculada cambió de estado. Este enlace ya no admite pagos. Continúa a MedSync para consultar tu plan y las opciones disponibles.';
      if (this.attempt && this.attempt.status === 'rejected') return 'No pudimos preparar esta solicitud. Actualiza su estado o vuelve a MedSync para revisar tu plan.';
      if (this.confirmed) return this.accountError || 'Tu pago se confirmó. Estamos activando tu plan.';
      if (this.exceptional) return 'No pudimos recuperar el resultado. Puedes actualizar esta misma solicitud sin iniciar otra compra.';
      if (this.preparingProvider) return 'Estamos preparando tu solicitud de pago.';
      if (this.canRetry) return 'Estamos preparando la ventana de PayPal. El estado se actualizará automáticamente.';
      if (this.paypalNotice) return this.paypalNotice;
      if (this.paypalApproved) return 'Recibimos tu aprobación. Tu plan se actualizará automáticamente cuando llegue la confirmación del pago.';
      if (this.paypalOpening) return 'Termina la contratación en la ventana segura de PayPal.';
      if (this.checkoutUrl && this.cancelledReturn) return 'Si no completaste la contratación, puedes retomarla en la ventana segura de PayPal con esta misma solicitud.';
      if (this.checkoutUrl) return this.paypalLoading ? 'Cargando PayPal para que puedas autorizar el pago…' : this.approval ? 'Haz clic en el botón de PayPal para revisar y confirmar la suscripción de ' + this.businessName + '.' : 'Continúa a PayPal para revisar y confirmar la suscripción de ' + this.businessName + '.';
      if (this.statusWorking || !this.authorityKnown) return this.cancelledReturn ? 'Estamos recuperando el resultado de tu suscripción.' : 'Estamos recibiendo la confirmación de PayPal.';
      if (this.cancelledReturn && !this.providerActive) return 'Si no completaste la contratación, puedes retomarla en la ventana segura de PayPal con esta misma solicitud.';
      return 'Estamos recibiendo la confirmación de PayPal.';
    }
  },
  watch: {
    paymentPhase: { immediate: true, handler(phase) { if (phase === 'pending' && !this.waitingSince) this.waitingSince = Date.now(); else if (!['pending', 'delayed'].includes(phase)) this.waitingSince = 0; } },
    '$route.query.attempt_id'(value) { if (this.creating && checkoutAttemptId(value) === this.creatingKey) return; this.resetContext(); },
    checkoutOwner() { this.resetContext(); },
    streamCredential() { this.startUpdates(); },
    awaitingConfirmation(approved) { if (approved && !this.loading && !this.busy) this.startConfirmationRecovery(); },
    closedCheckout(closed) { if (closed) { this.closePayPalWindow(); this.stopConfirmationRecovery(); } },
    providerUnavailable(blocked) { if (blocked) this.invalidatePayPal(); },
    preparingProvider(preparing) { if (preparing) this.$nextTick(() => { if (this.$refs.title) this.$refs.title.focus(); }); },
    accessConfirmed(confirmed) { if (confirmed) { this.stopConfirmationRecovery(); this.closePayPalWindow(); this.invalidatePayPal(); this.stopUpdates(); this.$nextTick(() => { if (!this._isDestroyed && this.$refs.title) this.$refs.title.focus(); }); } },
    documents(next) { if (this.selectedDocument && !next.some(doc => doc.documentVersionId === this.selectedDocument.documentVersionId && doc.contentHash === this.selectedDocument.contentHash)) this.closeDocument(); }
  },
  created() { this.initialize(); },
  mounted() { if (this.$refs.title) this.$refs.title.focus(); this.timer = setInterval(() => { this.now = Date.now(); }, 1000); },
  beforeDestroy() { this.stopConfirmationRecovery(); this.closePayPalWindow(); clearInterval(this.timer); this.stopUpdates(); if (this.requestController) this.requestController.abort(); this.redirectIntent = ''; this.invalidatePayPal(); this.clearLegal(); },
  methods: {
    current(controller) { return !this._isDestroyed && this.requestController === controller && !controller.signal.aborted; },
    controller() { this.stopConfirmationRecovery(); this.confirmationRequest = null; this.refreshingPaidSession = false; this.metadataRequest = null; if (this.requestController) this.requestController.abort(); const controller = new AbortController(); this.requestController = controller; return controller; },
    stopUpdates() { this.streamGeneration = (this.streamGeneration || 0) + 1; if (this.closeUpdates) this.closeUpdates(); this.closeUpdates = null; this.updatesOpen = false; },
    startUpdates() {
      this.stopUpdates();
      if (!this.canManage || !this.attemptId || this.accessConfirmed || this.authRequired || this.recovering) return false;
      const id = this.attemptId, owner = this.checkoutOwner, generation = this.streamGeneration;
      const current = () => !this._isDestroyed && this.attemptId === id && this.checkoutOwner === owner && generation === this.streamGeneration;
      const close = Payments.watchSubscription({
        updated: snapshot => { if (current()) this.applySubscriptionSnapshot(snapshot); },
        ended: () => { if (current()) this.updatesOpen = false; }
      });
      this.closeUpdates = close; this.updatesOpen = Boolean(close); return this.updatesOpen;
    },
    applySubscriptionSnapshot(snapshot) {
      if (!newerSubscriptionSnapshot(snapshot, this.business.id_business, this.snapshotRevision)) return;
      this.snapshotRevision = snapshot.revision; this.subscription = snapshot.subscription; this.license = snapshot.license; this.authorityKnown = true;
      if (this.providerUnavailable) this.invalidatePayPal();
      this.recoverAttemptFromSnapshot(); this.completeFromSnapshot();
    },
    completeFromSnapshot() {
      if (this.confirmed && !this.sessionFresh && !this.refreshingPaidSession && this.requestController) {
        const controller = this.requestController;
        this.refreshPaidSession(controller).catch(() => { if (this.current(controller)) this.accountError = 'No pudimos actualizar el acceso a tu cuenta. Vuelve a consultar esta misma solicitud.'; });
      }
    },
    async recoverAttemptFromSnapshot() {
      const attempt = this.attempt, revision = this.snapshotRevision;
      if (!attempt || !['pending', 'processing'].includes(attempt.status) || !revision || this.metadataRequest || this.metadataRevision === revision) return;
      const controller = this.requestController, id = this.attemptId, owner = this.checkoutOwner;
      if (!controller || !this.current(controller)) return;
      const request = { revision }; this.metadataRequest = request; this.metadataRevision = revision;
      try {
        // A committed Billing event can finish preparation; this never creates or verifies a payment.
        const result = await Payments.attempt(id, controller.signal);
        if (!this.current(controller) || this.attemptId !== id || this.checkoutOwner !== owner || this.metadataRequest !== request
          || !usableAttempt(result, id) || result.planCode !== attempt.planCode || result.planPriceCode !== attempt.planPriceCode) return;
        this.attempt = result;
        if ((result.status === 'rejected' || result.errorCode === 'CHECKOUT_IN_PROGRESS') && await this.resumePendingCheckout(controller)) return;
        this.completeFromSnapshot(); if (!this.redirectReady() && !this.confirmed) this.preparePayPal();
      } catch (_) { /* Keep the latest webhook state and offer explicit recovery if metadata is unavailable. */ }
      finally {
        if (this.metadataRequest === request) {
          this.metadataRequest = null;
          if (this.current(controller) && revision !== this.snapshotRevision) this.recoverAttemptFromSnapshot();
        }
      }
    },
    invalidatePayPal() { this.paypalGeneration = (this.paypalGeneration || 0) + 1; this.paypalSession = null; this.paypalLoading = false; this.paypalReady = false; this.paypalOpening = false; this.paypalApproved = false; this.paypalNotice = ''; },
    async preparePayPal() {
      if (this.paypalPopup) return;
      this.invalidatePayPal();
      if (!this.approval || !this.checkoutUrl) return;
      const generation = this.paypalGeneration, id = this.attemptId, owner = this.checkoutOwner, approval = this.approval;
      const current = () => !this._isDestroyed && generation === this.paypalGeneration && id === this.attemptId && owner === this.checkoutOwner && !this.confirmed && !this.providerActive && !this.providerUnavailable && !this.paypalApproved;
      const offer = selectedOffer(this.catalog, this.attempt.planCode, this.attempt.planPriceCode);
      this.paypalLoading = true;
      const failed = () => { if (current()) { this.paypalOpening = false; this.paypalNotice = 'No pudimos abrir la ventana de PayPal. Puedes volver a intentarlo con esta misma solicitud.'; } };
      try {
        const session = await preparePayPalApproval(approval, offer && offer.price.currency, {
          onApprove: data => { if (!current()) return; if (!data || data.subscriptionId !== approval.subscriptionId) { failed(); return; } this.paypalOpening = false; this.paypalApproved = true; this.paypalNotice = ''; this.startConfirmationRecovery(); },
          onCancel: () => { if (current()) { this.paypalOpening = false; this.paypalNotice = 'Cerraste PayPal. Puedes retomar el pago con esta misma solicitud.'; } },
          onError: failed
        });
        if (!current()) return;
        this.paypalSession = session; this.paypalReady = true;
      } catch (_) { if (current()) this.paypalNotice = 'No pudimos cargar la ventana de PayPal. Vuelve a cargarla para continuar con esta misma solicitud.'; }
      finally { if (current()) this.paypalLoading = false; }
    },
    openPayPal() {
      if (!this.approval && this.checkoutUrl && !this.busy && !this.loading && !this.paypalOpening && !this.awaitingConfirmation) { if (this.reservePayPalWindow()) this.navigateToProvider(this.checkoutUrl); return; }
      if (!this.paypalReady || !this.paypalSession || !this.approval || this.busy || this.loading || this.paypalOpening || this.paypalApproved) return;
      const generation = this.paypalGeneration; this.paypalOpening = true; this.paypalNotice = '';
      // Start synchronously in the click: awaiting here would lose the browser's popup permission.
      try {
        Promise.resolve(this.paypalSession.start({ presentationMode: 'popup' }, Promise.resolve({ subscriptionId: this.approval.subscriptionId }))).catch(() => this.paypalFailed(generation));
      } catch (_) { this.paypalFailed(generation); }
    },
    paypalFailed(generation) { if (!this._isDestroyed && generation === this.paypalGeneration && !this.confirmed && !this.paypalApproved) { this.paypalOpening = false; this.paypalNotice = 'No pudimos abrir la ventana de PayPal. Puedes volver a intentarlo con esta misma solicitud.'; } },
    continuePending() { if (this.confirmed && !this.accessConfirmed) return this.continueCompletion(); if (this.attemptId) return this.continueToMedsync(); return this.onboardingChoice ? this.continueFree() : this.continueToMedsync(); },
    async continueCompletion() {
      if (this.leaving || !this.confirmed || this.authRequired) return;
      const owner = this.checkoutOwner; this.leaving = true;
      try {
        const welcomePending = this.activation && this.activation.welcomePending === true || this.business.registrationWelcomePending === true;
        const destination = welcomePending ? { name: 'accountActivation' } : activationDestination(this.activation) || { name: 'home' };
        // The router still enforces access; the existing store refresh outlives this view.
        await this.$router.push(destination);
      } catch (_) { if (!this._isDestroyed && this.checkoutOwner === owner) await this.showError({ code: 'ACTIVATION_UNAVAILABLE' }); }
      finally { if (!this._isDestroyed && this.checkoutOwner === owner) this.leaving = false; }
    },
    resetContext() {
      this.stopConfirmationRecovery(); this.closePayPalWindow(); this.confirmationReads = 0;
      this.stopUpdates(); if (this.requestController) this.requestController.abort();
      this.invalidatePayPal(); this.refreshingPaidSession = false; this.metadataRequest = null; this.metadataRevision = ''; this.snapshotRevision = ''; this.waitingSince = 0; this.redirectIntent = ''; this.redirectDone = false; this.attempt = null; this.subscription = null; this.license = null; this.authorityKnown = false; this.sessionFresh = false; this.accountError = ''; this.busy = false; this.leaving = false; this.creating = false; this.creatingKey = ''; this.retryAt = 0; this.missingAttempt = false; this.recovering = false; this.checkoutKey = ''; this.activation = null; this.clearLegal(); this.initialize();
    },
    clearLegal() { this.closeDocument(); this.prepared = null; this.accepted = {}; this.legalKey = ''; this.legalAcceptanceId = ''; this.legalSent = false; this.frozenConfirmations = null; },
    clearSelection() { if (this.busy || this.legalSent) return; this.closeDocument(); this.selection = null; this.error = ''; },
    dateLabel(value) { return new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); },
    documentConfirmation(doc) { return (doc.requiredAction === 'acknowledge' ? 'He leído ' : doc.requiredAction === 'consent' ? 'Doy mi consentimiento a ' : 'Acepto ') + doc.title; },
    async openDocument(doc, event) { if (this.busy || !this.documents.some(item => item.documentVersionId === doc.documentVersionId && item.contentHash === doc.contentHash)) return; this.legalTrigger = event.currentTarget; this.selectedDocument = doc; this.legalOpen = true; await this.$nextTick(); const title = this.$refs.legalTitle; const dialog = title && title.closest('[role="dialog"]'); if (this.legalOpen && dialog) { dialog.setAttribute('aria-labelledby', title.id); title.focus(); } },
    closeDocument() { this.legalOpen = false; this.restoreLegalFocus(false); },
    restoreLegalFocus(open) { if (open) return; this.$nextTick(() => { if (this.legalOpen) return; this.selectedDocument = null; if (this.legalTrigger && this.legalTrigger.isConnected && !this.legalTrigger.disabled) this.legalTrigger.focus(); else if (this.$refs.title) this.$refs.title.focus(); this.legalTrigger = null; }); },
    preventDocumentNavigation(event) { if (event.target.closest('a')) event.preventDefault(); },
    async showError(error) { if (this._isDestroyed) return; this.closePayPalWindow(); this.stopConfirmationRecovery(); this.error = paymentErrorMessage(error); this.authRequired = error && error.status === 401; this.redirectIntent = ''; this.redirectDone = false; this.closeDocument(); if (error && error.retryAfterSeconds) this.cooldown(error.retryAfterSeconds); await this.$nextTick(); if (this.$refs.alert) this.$refs.alert.focus(); },
    cooldown(seconds) { this.now = Date.now(); this.retryAt = this.now + Math.max(0, Math.min(86400, Number(seconds) || 0)) * 1000; },
    async resumePendingCheckout(controller) {
      const owner = this.checkoutOwner, current = () => this.current(controller) && owner === this.checkoutOwner;
      const subscription = await Payments.subscription(controller.signal);
      if (!current()) return true;
      if (!subscription || subscription.status !== 'pending') return false;
      if (subscription.productCode !== 'medsync' || subscription.organizationId !== this.buyer.organizationId) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      const id = checkoutAttemptId(subscription.pendingCheckoutAttemptId);
      if (!id) throw { code: 'CHECKOUT_IN_PROGRESS' };
      let attempt;
      try { attempt = await Payments.attempt(id, controller.signal); }
      catch (error) { if (error.status === 404) throw { code: 'CHECKOUT_IN_PROGRESS' }; throw error; }
      if (!current()) return true;
      if (!usableAttempt(attempt, id) || !['pending', 'processing', 'ready'].includes(attempt.status) || attempt.abandoned === true
        || attempt.planCode !== subscription.planCode || attempt.planPriceCode !== subscription.planPriceCode
        || (attempt.status === 'ready' || attempt.subscriptionId) && attempt.subscriptionId !== subscription.id
        || ['cancelled', 'expired', 'suspended', 'past_due'].includes(attempt.subscriptionStatus)
        || ['cancelled', 'expired', 'failed'].includes(attempt.checkoutStatus)) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      const requested = this.attempt || this.selection || { planCode: this.$route.query.plan_code, planPriceCode: this.$route.query.price_code };
      this.subscription = subscription;
      if (requested.planCode && requested.planCode !== attempt.planCode || requested.planPriceCode && requested.planPriceCode !== attempt.planPriceCode) throw { code: 'CHECKOUT_IN_PROGRESS' };
      // Reuse the buyer-bound approval; leaving never creates a second provider contract.
      if (id === this.attemptId) {
        this.receipt(attempt); this.clearLegal(); this.selection = null;
        await this.readAuthority(controller); if (current()) this.startUpdates();
      } else await this.$router.replace({ name: 'accountPlans', query: { attempt_id: id } });
      return true;
    },
    async loadLegal(controller) {
      if (await this.resumePendingCheckout(controller)) return;
      if (!this.legalKey) this.legalKey = registrationAttemptId();
      if (!this.checkoutKey) this.checkoutKey = this.attemptId || this.legalKey;
      this.legalLoading = true;
      try { const result = await Payments.prepareLegal(this.legalKey, controller.signal); if (!this.current(controller)) return; if (!legalDocuments(result).length) throw { code: 'LEGAL_UNAVAILABLE' }; this.prepared = result; }
      finally { if (this.current(controller)) this.legalLoading = false; }
    },
    async initialize() {
      if (returnFromPayPalWindow(this.attemptId, this.$route.query.result)) return;
      if (this.busy || !this.canManage) { this.loading = false; return; }
      this.stopUpdates(); const controller = this.controller();  this.loading = true; this.error = ''; this.authRequired = false; this.missingAttempt = false; this.recovering = false; this.checkoutKey = this.attemptId; this.activation = null;
      this.attempt = null; this.subscription = null; this.license = null; this.authorityKnown = false; this.sessionFresh = false; this.accountError = ''; this.clearLegal(); this.selection = null;
      if (this.invalidAttempt) { this.error = 'El enlace de la solicitud no es válido. Abre el enlace original.'; this.loading = false; return; }
      try {
        const results = await Promise.allSettled([Payments.plans(controller.signal), this.attemptId ? Payments.attempt(this.attemptId, controller.signal) : this.loadLegal(controller), Registration.activation()]);
        if (!this.current(controller)) return;
        if (results[2].status === 'fulfilled') this.activation = results[2].value;
        this.catalog = results[0].status === 'fulfilled' ? results[0].value : null;
        if (!this.attemptId && this.offersAvailable) this.selection = selectedOffer(this.catalog, this.$route.query.plan_code, this.$route.query.price_code);
        if (results[1].status === 'rejected') throw results[1].reason;
        if (this.attemptId) { this.receipt(results[1].value); if ((this.attempt.status === 'rejected' || this.attempt.errorCode === 'CHECKOUT_IN_PROGRESS') && await this.resumePendingCheckout(controller)) return; await this.readAuthority(controller, true); this.startUpdates(); }
        else if (results[0].status === 'rejected') throw results[0].reason;
      } catch (error) { if (this.current(controller)) { this.missingAttempt = error.status === 404 && Boolean(this.attemptId); await this.showError(error); } }
      finally { if (this.current(controller)) { this.loading = false; if (this.awaitingConfirmation && !this.authRequired) this.startConfirmationRecovery(false); } }
    },
    selectPlan({ plan, price }) { if (this.busy || this.attemptId && !this.recovering || !this.catalog || !this.catalog.checkoutAvailable) return; this.closeDocument(); this.selection = selectedOffer(this.catalog, plan.code, price.code); },
    async refreshLegal() {
      if (this.busy || this.attemptId && !this.recovering) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.clearLegal();
      try { await this.loadLegal(controller); } catch (error) { if (this.current(controller)) await this.showError(error); } finally { if (this.current(controller)) this.busy = false; }
    },
    closePayPalWindow() { if (this.paypalPopup) this.paypalPopup.close(); this.paypalPopup = null; this.paypalOpening = false; this.redirectIntent = ''; },
    reservePayPalWindow() {
      if (this.paypalPopup) return true;
      const owner = this.checkoutOwner;
      try {
        const popup = openPayPalWindow({
          onReturn: result => {
            if (this._isDestroyed || this.paypalPopup !== popup || this.checkoutOwner !== owner || result.attemptId !== this.attemptId) return false;
            this.paypalPopup = null; this.paypalOpening = false; this.redirectDone = false;
            if (result.result === 'approved') { this.paypalApproved = true; this.paypalNotice = ''; this.startConfirmationRecovery(); }
            else { this.paypalNotice = 'Cerraste PayPal. Puedes retomar el pago con esta misma solicitud.'; this.preparePayPal(); }
            return false;
          },
          onClose: () => {
            if (this._isDestroyed || this.paypalPopup !== popup || this.checkoutOwner !== owner) return;
            this.paypalPopup = null; this.redirectIntent = ''; this.redirectDone = false; this.paypalOpening = false;
            if (!this._isDestroyed && this.checkoutOwner === owner) { this.paypalNotice = 'Cerraste PayPal. Puedes retomar el pago con esta misma solicitud.'; this.preparePayPal(); }
          }
        });
        this.paypalPopup = popup;
        return true;
      } catch (_) { this.paypalNotice = 'Permite las ventanas emergentes para continuar con PayPal.'; this.error = this.paypalNotice; return false; }
    },
    navigateToProvider(url) {
      if (!this.paypalPopup) return;
      try { this.paypalPopup.navigate(url, this.attemptId); this.paypalOpening = true; }
      catch (_) { this.closePayPalWindow(); this.paypalNotice = 'No pudimos abrir la ventana de PayPal. Puedes retomar esta misma solicitud.'; this.preparePayPal(); }
    },
    stopConfirmationRecovery() { clearTimeout(this.confirmationTimer); this.confirmationTimer = null; },
    startConfirmationRecovery(immediate = true) {
      this.stopConfirmationRecovery();
      if (!this.awaitingConfirmation || this.accessConfirmed || this.closedCheckout || this.authRequired || this.confirmationRequest || !this.requestController) return;
      const controller = this.requestController;
      const recover = async () => {
        if (!this.current(controller) || this.accessConfirmed || this.closedCheckout || this.authRequired || this.confirmationReads >= 6) return;
        this.confirmationReads++; this.confirmationRequest = controller;
        try { await this.readAuthority(controller, true); }
        catch (error) { if (this.current(controller) && error.status === 401) await this.showError(error); }
        finally { if (this.confirmationRequest === controller) { this.confirmationRequest = null; if (this.current(controller)) this.startConfirmationRecovery(false); } }
      };
      if (immediate) recover();
      else if (this.confirmationReads < 6) this.confirmationTimer = setTimeout(recover, [3000, 5000, 10000, 15000, 30000, 30000][this.confirmationReads]);
    },
    redirectReady() {
      if (!this.redirectIntent || this.redirectIntent !== this.attemptId || this.redirectDone || this.providerActive || this.providerUnavailable || !usableAttempt(this.attempt, this.attemptId) || this.attempt.status !== 'ready') return false;
      if (!this.paypalPopup) { this.redirectIntent = ''; return false; }
      const url = safePaymentUrl(this.attempt.checkoutUrl);
      if (!url) return false;
      this.redirectIntent = ''; this.redirectDone = true;  this.navigateToProvider(url); return true;
    },
    async createCheckout() {
      if (!this.canCreate || !this.reservePayPalWindow()) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.authRequired = false; this.closeDocument();
      const snapshot = { idempotencyKey: this.attemptId || this.checkoutKey || this.legalKey, planCode: this.selection.planCode, planPriceCode: this.selection.planPriceCode };
      try {
        if (await this.resumePendingCheckout(controller)) { this.closePayPalWindow(); return; }
        this.creating = true; this.creatingKey = snapshot.idempotencyKey; this.redirectIntent = snapshot.idempotencyKey; this.redirectDone = false;
        if (this.attemptId !== snapshot.idempotencyKey || Object.keys(this.$route.query).length !== 1) await this.$router.replace({ name: 'accountPlans', query: { attempt_id: snapshot.idempotencyKey } });
        if (!this.current(controller)) return;
        if (!this.legalAcceptanceId) {
          if (!this.frozenConfirmations) this.frozenConfirmations = this.documents.map(doc => ({ documentVersionId: doc.documentVersionId, contentHash: doc.contentHash, accepted: true }));
          this.legalSent = true;
          const accepted = await Payments.acceptLegal({ requestId: this.prepared.requestId, idempotencyKey: this.legalKey, confirmations: this.frozenConfirmations }, controller.signal);
          if (!this.current(controller)) return;
          if (!accepted || accepted.accepted !== true || accepted.requestId !== this.prepared.requestId || typeof accepted.legalAcceptanceId !== 'string' || !accepted.legalAcceptanceId) throw { code: 'LEGAL_ACCEPTANCE_INVALID' };
          this.legalAcceptanceId = accepted.legalAcceptanceId;
        }
        this.recovering = false; this.missingAttempt = false;
        const result = await Payments.create({ ...snapshot, legalAcceptanceId: this.legalAcceptanceId }, controller.signal);
        if (!this.current(controller)) return;
        this.receipt(result); this.clearLegal(); this.selection = null;
        if ((this.attempt.status === 'rejected' || this.attempt.errorCode === 'CHECKOUT_IN_PROGRESS') && await this.resumePendingCheckout(controller)) return;
        if (!this.redirectReady()) { if (!this.canRetry) this.redirectIntent = ''; await this.readAuthority(controller); this.startUpdates(); }
      } catch (error) {
        if (this.current(controller)) {
          if (this.creating && [409, 422].includes(error.status)) {
            try { if (await this.resumePendingCheckout(controller)) return; }
            catch (recovery) { if (this.current(controller)) await this.showError(recovery); return; }
          }
          if (!this.current(controller)) return;
          await this.showError(error);
          if (error.status === 409 && this.creating) { try { const original = await Payments.attempt(snapshot.idempotencyKey, controller.signal); if (this.current(controller)) { this.receipt(original); await this.readAuthority(controller); } } catch (lookup) { if (this.current(controller)) this.missingAttempt = lookup.status === 404; } }
        }
      } finally { if (this.current(controller)) { this.busy = false; this.creating = false; this.creatingKey = ''; this.startUpdates(); } }
    },
    receipt(value) { if (!usableAttempt(value, this.attemptId)) throw { code: 'PAYMENT_INVALID_RESPONSE' }; this.attempt = value; this.missingAttempt = false; this.recovering = false; this.authorityKnown = false; this.sessionFresh = false; this.accountError = ''; this.cooldown(value.retryAfterSeconds); this.preparePayPal(); },
    async readAuthority(controller, reconcile = false) {
      // Recover the committed Billing state even when a webhook or SSE notification was missed.
      if (reconcile) { await Payments.license(controller.signal); if (!this.current(controller)) return; }
      const revision = this.snapshotRevision;
      const snapshot = await Payments.savedSnapshot(controller.signal);
      if (!this.current(controller) || revision !== this.snapshotRevision) return;
      if (snapshot === null) { this.subscription = null; this.license = null; this.authorityKnown = true; return; }
      if (!newerSubscriptionSnapshot(snapshot, this.business.id_business, '')) throw { code: 'PAYMENT_INVALID_RESPONSE' };
      if (newerSubscriptionSnapshot(snapshot, this.business.id_business, this.snapshotRevision)) {
        this.snapshotRevision = snapshot.revision; this.subscription = snapshot.subscription; this.license = snapshot.license;
      }
      this.authorityKnown = true; if (this.providerUnavailable) this.invalidatePayPal(); this.recoverAttemptFromSnapshot();
      if (this.confirmed && !this.refreshingPaidSession) await this.refreshPaidSession(controller);
    },
    async refreshPaidSession(controller) {
      if (this.refreshingPaidSession) return;
      this.refreshingPaidSession = true; this.sessionFresh = false; this.accountError = '';
      try {
        const results = await Promise.allSettled([Registration.activation(), this.$store.dispatch('CORE/AUTH/refreshAccess', { hydrate: true })]);
        if (!this.current(controller)) return;
        this.activation = results[0].status === 'fulfilled' ? results[0].value : null;
        const refreshed = results[1].status === 'fulfilled' ? results[1].value : null;
        const session = refreshed && refreshed.success === true && refreshed.data;
        this.sessionFresh = Boolean(session && session.authenticated === true && session.business && session.business.id_business && session.business.id_business === this.business.id_business && paidSessionApplied(session.business, this.license, session.tenantOperational, this.now));
        if (!this.sessionFresh || !paidSessionApplied(this.business, this.license, this.$store.getters['CORE/AUTH/getTenantOperational'], this.now)) this.accountError = 'No pudimos actualizar el acceso a tu cuenta. Vuelve a consultar esta misma solicitud.';
      } finally { if (this.requestController === controller) this.refreshingPaidSession = false; }
    },
    async consult() {
      if (this.busy || this.loading || !this.attemptId) return;
      if (this.retryAt > Date.now()) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.authRequired = false;
      try { const result = await Payments.attempt(this.attemptId, controller.signal); if (!this.current(controller)) return; this.receipt(result); if ((this.attempt.status === 'rejected' || this.attempt.errorCode === 'CHECKOUT_IN_PROGRESS') && await this.resumePendingCheckout(controller)) return; if (!this.redirectReady()) await this.readAuthority(controller, true); }
      catch (error) { if (this.current(controller)) { this.missingAttempt = error.status === 404; if (this.missingAttempt) { this.attempt = null; this.authorityKnown = false; } await this.showError(error); } }
      finally { if (this.current(controller)) { this.busy = false; this.startUpdates(); if (this.awaitingConfirmation) this.startConfirmationRecovery(false); } }
    },
    async recoverMissing() { if (this.busy || this.loading || !this.missingAttempt || !this.attemptId) return;  this.recovering = true; this.checkoutKey = this.attemptId; this.selection = null; this.redirectIntent = ''; this.clearLegal(); this.error = ''; await this.refreshLegal(); },
    async operate(action) {
      if (!this.exceptional || this.busy || this.loading || !this.attemptId || this.retryAt > Date.now() || action !== 'retry' || !this.canRetry || this.retryRemaining > 0) return;
      const controller = this.controller(); this.busy = true; this.error = ''; this.authRequired = false;  this.redirectIntent = '';
      try { const result = await Payments[action](this.attemptId, controller.signal); if (!this.current(controller)) return; this.receipt(result); await this.readAuthority(controller); }
      catch (error) { if (this.current(controller)) { await this.showError(error); } }
      finally { if (this.current(controller)) { this.busy = false; this.startUpdates(); if (this.awaitingConfirmation) this.startConfirmationRecovery(false); } }
    },
    async resumeLogin() {
      if (this.busy) return;
      this.busy = true;
      try {
        const refreshed = await this.$store.dispatch('CORE/AUTH/getToken');
        if (this._isDestroyed) return;
        if (this.$store.getters['CORE/AUTH/isAuthorized']) {
          const confirmed = refreshed && refreshed.success === true && refreshed.data && refreshed.data.authenticated === true;
          this.authRequired = !confirmed;
          this.error = confirmed ? 'La sesión se actualizó. Consulta el estado de este intento; la solicitud de pago no se reenviará automáticamente.' : 'No pudimos confirmar una sesión nueva. Vuelve a consultar cuando el servicio esté disponible; no se cerró la sesión ni se reenviará el pago.';
          return;
        }
        await this.$router.push(this.loginRoute);
      } catch (_) { if (!this._isDestroyed) this.error = 'No pudimos validar la sesión. Vuelve a intentarlo cuando el servicio esté disponible.'; }
      finally { if (!this._isDestroyed) this.busy = false; }
    },
    async continueAccount(trialOnly) {
      if (this.busy || this.loading) return;
      const controller = this.controller(); this.busy = true; this.error = '';
      try {
        let status = await Registration.activation();
        if (!this.current(controller)) return;
        this.activation = status;
        const preparedDestination = activationDestination(status);
        if (trialOnly && !trialChoiceEligible(status)) throw { code: 'TRIAL_NOT_AVAILABLE' };
        if (preparedDestination && preparedDestination.name !== 'tenantRestricted' && status.welcomePending === true && status.commercialState === 'activated' && status.contact && status.contact.emailVerified === true) {
          const acknowledged = await Registration.acknowledgeWelcome(trialOnly);
          if (!this.current(controller)) return;
          if (!acknowledged || acknowledged.acknowledged !== true) throw { code: 'ACTIVATION_UNAVAILABLE' };
          status = await Registration.activation();
          if (!this.current(controller)) return;
          this.activation = status;
        }
        const currentDestination = activationDestination(status);
        // Acknowledging the welcome must not skip the server's preparation destination.
        const destination = currentDestination && currentDestination.name !== 'tenantRestricted' && preparedDestination && preparedDestination.name === 'admin' ? preparedDestination : currentDestination;
        if (!destination) throw { code: 'ACTIVATION_UNAVAILABLE' };
        await this.$store.dispatch('CORE/AUTH/getToken');
        if (this.current(controller)) await this.$router.push(destination);
      } catch (error) { if (this.current(controller)) await this.showError(error); }
      finally { if (this.current(controller)) this.busy = false; }
    },
    continueFree() { return this.continueAccount(true); },
    async continueToMedsync() {
      if (this.confirmed && !this.accessConfirmed) return this.continueCompletion();
      if (this.activation && this.activation.welcomePending === true || this.business.registrationWelcomePending === true) return this.continueAccount(false);
      if (this.busy || this.loading) return;
      const controller = this.controller(); this.busy = true;
      try {
        await this.$store.dispatch('CORE/AUTH/getToken');
        if (this.current(controller)) await this.$router.push({ name: 'home' });
      } catch (_) { if (this.current(controller)) await this.showError({ code: 'ACTIVATION_UNAVAILABLE' }); }
      finally { if (this.current(controller)) this.busy = false; }
    }
  }
};
</script>
<style scoped>
.payment-content { min-width:0; color:var(--color-primary-900); }
.payment-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:24px; }
.payment-context { margin:0 0 12px; color:var(--color-grey); font-size:13px; line-height:1.5; overflow-wrap:anywhere; }
.payment-header h1 { margin:0; color:var(--color-primary-900); font-size:30px; font-weight:700; letter-spacing:-.025em; line-height:1.2; }
.payment-header h1:focus { outline:none; }
.payment-header h2 { font-size:22px; line-height:1.4; }
.payment-subtitle { margin:10px 0 0; color:var(--color-grey); font-size:15px; line-height:1.6; }
.payment-trial { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:18px; margin:0 0 28px; padding:0 0 24px; border-bottom:1px solid var(--auth-border); }
.payment-trial-main { display:flex; align-items:center; gap:14px; flex:1; min-width:180px; }
.payment-trial h2 { margin:0; color:var(--color-primary-900); font-size:18px; font-weight:700; line-height:1.4; }
.payment-trial-main p { margin:5px 0 0; color:var(--color-grey); font-size:13px; line-height:1.6; }
.payment-trial-note { flex-basis:100%; margin:0; }
.payment-panel { margin-top:20px; padding:24px; border:1px solid var(--auth-border); border-radius:14px; background:var(--color-surface); }
.payment-panel h2 { margin:0; font-size:21px; line-height:1.4; font-weight:700; }
.payment-panel>p { margin-top:12px; font-size:15px; line-height:1.6; }
.payment-alert { padding:16px; margin:16px 0; border:1px solid #e6c4a4; border-radius:12px; background:#fff9f2; color:var(--color-primary-900); font-size:14px; line-height:1.6; }
.payment-hint { font-size:13px; color:var(--color-grey); line-height:1.65; }
.payment-hint code,.payment-reference code { overflow-wrap:anywhere; }
.payment-reference { margin:12px 0; color:var(--color-grey); font-size:12px; }
.payment-reference summary { display:list-item; cursor:pointer; padding:6px 0; }
.payment-reference code { display:block; margin-top:6px; }
.payment-actions { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:20px; }
.payment-content .v-btn { min-height:44px; max-width:100%; height:auto!important; border-radius:10px; font-size:13px; font-weight:600; letter-spacing:0; text-transform:none; white-space:normal; }
.payment-content ::v-deep .v-btn__content { flex-shrink:1; white-space:normal; overflow-wrap:anywhere; line-height:1.4; padding:8px 0; }
.payment-content .v-btn--text,.payment-content .v-btn--outlined { color:var(--color-primary-700); }
.payment-content .payment-primary-button:not(.v-btn--disabled) { background:var(--color-primary-700)!important; color:var(--color-surface)!important; }
.payment-content .payment-primary-button:hover:not(.v-btn--disabled) { background:var(--auth-primary-hover)!important; }
.payment-primary { display:inline-flex; align-items:center; min-height:44px; padding:10px 18px; border-radius:10px; background:var(--color-primary-700); color:var(--color-surface); font-size:14px; font-weight:600; text-decoration:none; }
.payment-primary:hover { background:var(--auth-primary-hover); }
.payment-content button:focus-visible,.payment-content a:focus-visible,.payment-reference summary:focus-visible { outline:3px solid var(--auth-focus); outline-offset:3px; }
.payment-legal { border:0; padding:0; margin:24px 0; }
.payment-legal legend { font-size:17px; font-weight:600; margin-bottom:12px; }
.payment-document { border-top:1px solid var(--auth-border); padding:14px 0; }
.payment-document a { display:inline-block; min-height:44px; padding:10px 0; font-size:14px; line-height:1.6; text-decoration:underline; color:var(--auth-link); }
.payment-document ::v-deep .v-label { font-size:14px; line-height:1.5; }
@media(max-width:600px) {
  .payment-header { flex-direction:column; gap:12px; margin-bottom:22px; }
  .payment-header h1 { font-size:27px; }
  .payment-trial { gap:16px; }
  .payment-trial-main { align-items:flex-start; }
  .payment-trial>.v-btn { width:100%; }
  .payment-panel { padding:18px; }
  .payment-actions { align-items:stretch; flex-direction:column; }
  .payment-actions>* { justify-content:center; width:100%; }
}

.payment-legal-accepted .payment-document { display:inline-block; border:0; padding:0; margin-right:18px; }
.payment-document-accepted .payment-document-link { margin-left:0; }
.payment-document ::v-deep .v-input--checkbox { margin-top:0; padding-top:0; }
.payment-document-link { min-height:44px; padding:8px 0; margin-left:32px; color:var(--auth-link); font-size:14px; font-weight:600; text-align:left; }
.payment-document-link:hover { text-decoration:underline; }
.payment-legal-dialog.v-card { border-radius:14px; max-height:min(44rem,86vh); max-height:min(44rem,86dvh); padding:0; background:var(--color-surface); }
.payment-document-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:20px 24px 16px; border-bottom:1px solid var(--auth-border); }
.payment-document-header h2 { margin:0; color:var(--color-primary-900); font-size:clamp(1.15rem,3vw,1.4rem); line-height:1.3; overflow-wrap:anywhere; }
.payment-document-header .v-btn { flex-shrink:0; width:44px; height:44px; color:var(--color-primary-900); }
.payment-legal-dialog .payment-document-body { min-height:0; margin:0; padding:20px 24px 24px; color:var(--color-primary-900); font-size:15px; line-height:1.65; overscroll-behavior:contain; overflow-wrap:anywhere; }
.payment-document-body ::v-deep table { display:block; max-width:100%; overflow-x:auto; }
.payment-document-body ::v-deep h1 { font-size:1.3rem; }.payment-document-body ::v-deep h2 { font-size:1.15rem; }
/* The payment return is one centered surface; all state comes from saved webhook evidence. */
.payment-page.payment-page--checkout { display:flex; align-items:center; justify-content:center; min-height:100vh; min-height:100dvh; background:var(--color-gray98); }
.payment-page--checkout::before,.payment-page--checkout::after,.payment-page--checkout ::v-deep .auth-visual-panel { display:none; }
.payment-page--checkout ::v-deep .auth-card-panel { min-height:100vh; min-height:100dvh; padding:28px 20px; }
.payment-page--checkout ::v-deep .auth-card-panel .auth-card { position:relative; max-width:590px; padding:24px 30px; border:1px solid var(--auth-border); border-radius:18px; box-shadow:0 14px 44px rgba(18,41,74,.08); }
.payment-page--checkout ::v-deep .auth-brand { margin-bottom:30px; }
.payment-focus { padding:0; margin:0; border:0; border-radius:0; background:var(--color-surface); }
.payment-focus-heading { display:flex; flex-direction:column; align-items:center; text-align:center; }
.payment-orb { position:relative; display:flex; align-items:center; justify-content:center; width:78px; height:78px; margin:6px 0 18px; border-radius:50%; background:var(--color-primary-100); color:var(--color-primary-700); }
.payment-orb .v-icon { color:inherit; font-size:32px; }
.payment-orbit { position:absolute; inset:-6px; border:2px solid var(--color-primary-100); border-top-color:var(--color-primary-700); border-radius:50%; }
.payment-orb:not(.payment-status-motion) .payment-orbit { display:none; }
.payment-status-motion .payment-orbit { animation:payment-rotate 1.15s linear infinite; }
.payment-orb--complete { animation:payment-arrive .28s ease-out; }
.payment-kicker { margin:0 0 6px; color:var(--color-primary-700); font-size:11px; font-weight:600; letter-spacing:.045em; text-transform:uppercase; }
.payment-focus h1 { margin:0; max-width:460px; color:var(--color-primary-900); font-size:clamp(23px,3vw,27px); font-weight:700; letter-spacing:-.025em; line-height:1.25; overflow-wrap:anywhere; }
.payment-focus h1:focus { outline:none; }
.payment-focus .payment-status-copy { margin:11px 0 0; max-width:390px; min-height:43px; color:var(--color-grey); font-size:13px; line-height:1.65; }
.payment-progress { display:flex; list-style:none; margin:20px 0; padding:0; }
.payment-progress li { position:relative; flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--color-grey); font-size:11px; }
.payment-progress li+li:before { content:''; position:absolute; top:13px; left:calc(-50% + 17px); width:calc(100% - 34px); height:1px; background:var(--auth-border); }
.payment-step-mark { position:relative; display:flex; align-items:center; justify-content:center; width:27px; height:27px; border:1px solid var(--auth-border); border-radius:50%; background:var(--color-surface); }
.payment-progress .complete .payment-step-mark { border-color:var(--color-primary-700); background:var(--color-primary-700); color:white; }
.payment-progress .complete .v-icon { color:inherit; }
.payment-progress [aria-current=step] .payment-step-mark { border-color:var(--color-primary-700); background:var(--color-primary-100); color:var(--color-primary-700); }
.payment-success-body { margin-top:16px; }
.payment-success-receipt { display:flex; justify-content:space-between; gap:18px; margin:0; padding:18px 0; border-top:1px solid var(--auth-border); border-bottom:1px solid var(--auth-border); }
.payment-success-receipt>div { min-width:0; flex:1; }
.payment-success-receipt>div:last-child:not(:first-child) { text-align:right; }
.payment-success-receipt dt { margin-bottom:4px; color:var(--color-grey); font-size:11px; line-height:1.5; }
.payment-success-receipt dd { margin:0; color:var(--color-primary-900); font-size:18px; font-weight:600; line-height:1.3; overflow-wrap:anywhere; }
.payment-success-amount { font-variant-numeric:tabular-nums; }
.payment-success-amount span { color:var(--color-grey); font-size:11px; font-weight:400; white-space:nowrap; }
.payment-confirmed-details { display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px 14px; padding-top:11px; color:var(--color-grey); font-size:11px; line-height:1.6; }
.payment-success-business { margin:17px 0 0; text-align:center; color:var(--color-grey); font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
.payment-success-actions,.payment-status-actions { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:12px; margin:20px 0 0; }
.payment-success-continue { min-width:220px; }
.payment-page--checkout ::v-deep .auth-card .login-form,
.payment-page--checkout .payment-content { position:static; }
.payment-checkout-navigation { position:absolute; top:16px; right:16px; z-index:2; }
.payment-checkout-navigation .v-btn { width:44px; min-width:44px; height:44px; margin:0; color:var(--color-grey); }
.payment-paypal-button { display:block; width:100%; max-width:320px; --paypal-button-border-radius:8px; }
.payment-success-terms,.payment-footnote { margin:17px 0 0; text-align:center; color:var(--color-grey); font-size:11px; line-height:1.6; }
.payment-paypal-fallback { width:228px; min-height:44px; border-radius:6px; background:#ffc439; overflow:hidden; }
.payment-paypal-fallback img { display:block; max-width:100%; height:auto; margin:auto; }
.payment-paypal-fallback:disabled { opacity:.5; cursor:default; }
.payment-plan-actions { justify-content:flex-end; }
.payment-recovery { margin-top:24px; text-align:left; color:var(--color-grey); font-size:13px; }
.payment-recovery summary { cursor:pointer; }
.payment-symbol-enter-active,.payment-symbol-leave-active { transition:opacity .15s ease,transform .15s ease; }
.payment-symbol-enter,.payment-symbol-leave-to { opacity:0; transform:scale(.8); }
@keyframes payment-rotate { to { transform:rotate(360deg); } }
@keyframes payment-arrive { from { transform:scale(.88); opacity:.5; } to { transform:scale(1); opacity:1; } }
@media(max-width:600px) {
  .payment-document-header,.payment-legal-dialog .payment-document-body { padding:16px; }
  .payment-page--checkout ::v-deep .auth-card-panel { padding:20px 12px; }
  .payment-page--checkout ::v-deep .auth-card-panel .auth-card { padding:24px 20px; }
  .payment-status-actions { flex-direction:column; align-items:stretch; }
  .payment-status-actions .v-btn,.payment-success-continue { width:100%; min-width:0; }
}
@media(prefers-reduced-motion:reduce) { .payment-status-motion .payment-orbit,.payment-orb--complete { animation:none; } .payment-symbol-enter-active,.payment-symbol-leave-active { transition:none; } }
</style>
