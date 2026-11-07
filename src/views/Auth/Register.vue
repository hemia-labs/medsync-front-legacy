<template>
  <account-flow-shell class="registration-page">
    <h1 id="account-title" ref="title" tabindex="-1" class="auth-title">Crea tu cuenta</h1>
    <p class="auth-subtitle">Tu prueba gratis de 15 días comienza al verificar tu correo. Sin tarjeta.</p>
    <div v-if="created">
      <div v-if="busy" class="registration-loading" role="status">
        <v-progress-circular indeterminate :size="14" :width="2" color="var(--color-primary-700)" aria-hidden="true" />
        <span>{{ sendingCode ? 'Enviando código…' : 'Preparando la verificación…' }}</span>
      </div>
      <button v-else-if="sessionEstablished" class="flow-primary" :disabled="remaining > 0" @click="resumeSession">
        {{ remaining > 0 ? 'Reintentar en ' + remaining + ' s' : needsInitialCode ? 'Reintentar envío' : 'Continuar con mi cuenta' }}
      </button>
      <template v-else>
        <p class="flow-copy">Tu cuenta está creada. Inicia sesión para verificar tu correo.</p>
        <router-link class="flow-primary" :to="{ name: 'login' }">Iniciar sesión</router-link>
      </template>
    </div>
    <form v-else novalidate :aria-busy="busy ? 'true' : 'false'" @submit.prevent="submit">
      <div class="registration-fields">
        <div v-for="field in fields" :key="field.key" :class="{ 'registration-field-wide': ['email', 'businessName'].includes(field.key) }">
          <label class="login-field-label" :for="'register-' + field.key">{{ field.label }}</label>
          <v-text-field :id="'register-' + field.key" v-model="form[field.key]" class="auth-input" :name="field.key"
            :type="['password', 'confirmPassword'].includes(field.key) ? (showPassword ? 'text' : 'password') : field.type"
            :placeholder="field.placeholder" :prepend-inner-icon="field.icon"
            :autocomplete="field.autocomplete" :inputmode="field.key === 'telephone' ? 'numeric' : undefined"
            :autocapitalize="['email', 'password', 'confirmPassword'].includes(field.key) ? 'none' : undefined"
            :spellcheck="false" :disabled="busy" :required="field.key !== 'telephone'" outlined dense color="var(--auth-focus)"
            :error-messages="errors[field.key] || []" hide-details="auto"
            :aria-invalid="errors[field.key] ? 'true' : 'false'"
            @input="onFieldInput(field.key)">
            <template v-if="['password', 'confirmPassword'].includes(field.key)" v-slot:append>
              <v-btn icon small type="button" :disabled="busy" :aria-pressed="showPassword ? 'true' : 'false'"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
                <v-icon small>{{ showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </div>
      </div>
      <div class="registration-agreements">
        <div v-if="loading" class="registration-loading" role="status">
          <v-progress-circular indeterminate :size="14" :width="2" color="var(--color-primary-700)" aria-hidden="true" />
          <span>Cargando términos y aviso de privacidad…</span>
        </div>
        <fieldset v-else-if="available" class="registration-legal-fields" aria-label="Términos y privacidad" :disabled="busy">
          <div v-for="doc in documents" :key="doc.documentKey" class="registration-legal-choice">
            <v-checkbox :id="doc.documentKey" v-model="accepted[doc.documentKey]" color="var(--color-primary-700)"
              hide-details class="remember-checkbox" :disabled="busy" :error="Boolean(legalError)" @change="clearLegalError"
              :aria-invalid="legalError ? 'true' : 'false'" :aria-describedby="legalError ? 'legal-help' : undefined">
              <template v-slot:label>
                <span>{{ documentConfirmation(doc) }}</span>
              </template>
            </v-checkbox>
            <button class="registration-legal-link" type="button" :disabled="busy" @click="openDocument(doc, $event)">Leer {{ doc.title }}</button>
          </div>
          <p v-if="legalError" id="legal-help" class="flow-error">{{ legalError }}</p>
        </fieldset>
        <div v-else>
          <p class="flow-alert registration-legal-alert" role="status">{{ contextError || 'El registro no está disponible por el momento.' }}</p>
          <button class="flow-secondary" type="button" :disabled="busy" @click="loadContext">Volver a consultar</button>
        </div>
      </div>
      <v-btn class="auth-submit registration-submit" type="submit" block depressed :loading="busy" :disabled="busy || loading || !available || remaining > 0">
        {{ remaining > 0 ? 'Reintentar en ' + remaining + ' s' : 'Crear cuenta' }}
        <v-icon right aria-hidden="true">mdi-arrow-right</v-icon>
      </v-btn>
    </form>
    <div v-if="error" ref="alert" class="flow-alert" role="alert" tabindex="-1">{{ error }}
      <button v-if="alreadyAuthenticated" class="flow-link" :disabled="busy" @click="resumeSession">Continuar con la sesión abierta</button>
    </div>
    <div class="login-register">
      <p>¿Ya tienes cuenta?</p>
      <v-btn text :to="{ name: 'login' }" :disabled="busy" color="var(--auth-link)" class="login-register-button">Iniciar sesión</v-btn>
    </div>
    <div class="login-security-divider"><v-icon small aria-hidden="true">mdi-lock-outline</v-icon><span>Registro seguro</span></div>
    <v-dialog v-model="legalOpen" width="calc(100% - 24px)" max-width="720" scrollable @input="restoreLegalFocus">
      <v-card v-if="selectedDocument" class="flow-legal registration-document">
        <header class="registration-document-header">
          <div>
            <h2 id="registration-legal-title" ref="legalTitle" tabindex="-1">{{ selectedDocument.title }}</h2>
            <p v-if="selectedDocument.version" class="flow-hint">Versión {{ selectedDocument.version }}</p>
          </div>
          <v-btn class="registration-document-close" icon type="button" aria-label="Cerrar documento"
            @click="legalOpen = false; restoreLegalFocus(false)">
            <v-icon aria-hidden="true">mdi-close</v-icon>
          </v-btn>
        </header>
        <!-- Only the sanitized published document is rendered. -->
        <v-card-text :key="selectedDocument.documentKey" class="flow-legal__body" tabindex="0" role="region" aria-label="Contenido del documento"
          @click="openLegalLink" v-html="legalHtml" />
      </v-card>
    </v-dialog>
  </account-flow-shell>
</template>
<script>
import DOMPurify from 'dompurify';
import AccountFlowShell from './AccountFlowShell.vue';
import Registration from '../../services/core/auth/DARegistrationService';
import { usableRegistrationContext, registrationAttemptId, registrationErrors, registrationErrorMessage, verificationStorageKey, saveVerification } from '../../utils/registration';

export default {
  components: { AccountFlowShell },
  data: () => ({
    form: { email: '', telephone: '', name: '', lastName: '', businessName: '', password: '', confirmPassword: '' },
    fields: [
      { key: 'email', placeholder: 'tu@correo.com', icon: 'mdi-email-outline', label: 'Correo electrónico', type: 'email', autocomplete: 'email' },
      { key: 'name', placeholder: 'Nombre', icon: 'mdi-account-outline', label: 'Nombre', type: 'text', autocomplete: 'given-name' },
      { key: 'lastName', placeholder: 'Apellidos', icon: 'mdi-account-outline', label: 'Apellidos', type: 'text', autocomplete: 'family-name' },
      { key: 'businessName', placeholder: 'Nombre del consultorio', icon: 'mdi-hospital-building', label: 'Consultorio', type: 'text', autocomplete: 'organization' },
      { key: 'password', placeholder: 'Mínimo 8 caracteres', icon: 'mdi-lock-outline', label: 'Contraseña', autocomplete: 'new-password' },
      { key: 'confirmPassword', placeholder: 'Repite tu contraseña', icon: 'mdi-lock-outline', label: 'Repetir contraseña', autocomplete: 'new-password' }
    ],
    context: null, contextError: '', loading: true, busy: false, error: '', errors: {}, legalError: '',
    accepted: {}, showPassword: false,
    legalOpen: false, selectedDocument: null, attemptId: null, created: false,
    sessionEstablished: false, registrationActivation: null, initialVerification: null, sendingCode: false,
    alreadyAuthenticated: false, remaining: 0, timer: null
  }),
  computed: {
    available() { return usableRegistrationContext(this.context); },
    documents() { return this.available ? this.context.legalDocuments : []; },
    needsInitialCode() {
      return this.registrationActivation && !this.registrationActivation.contact.emailVerified && !this.initialVerification;
    },
    legalHtml() {
      return DOMPurify.sanitize(this.selectedDocument ? this.selectedDocument.contentHtml : '', {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
        ALLOWED_ATTR: ['href', 'colspan', 'rowspan'], ALLOW_DATA_ATTR: false
      });
    }
  },
  created() {
    // Auth hydration can remount this view through App's access revision key.
    // The original submit owns navigation; do not issue a competing redirect.
    if (this.$store.getters['CORE/AUTH/isAuthorized']) {
      this.created = true; this.sessionEstablished = true; this.loading = false;
    } else this.loadContext();
  },
  mounted() { this.$refs.title.focus(); },
  beforeDestroy() { clearInterval(this.timer); this.form.password = ''; this.form.confirmPassword = ''; this.attemptId = null; },
  methods: {
    async loadContext() {
      this.loading = true; this.contextError = ''; this.error = '';
      const previous = this.context;
      try {
        const next = await Registration.context();
        if (this._isDestroyed) return;
        for (const key of next.legalDocuments.map(doc => doc.documentKey)) {
          const oldDoc = previous && previous.legalDocuments.find(doc => doc.documentKey === key);
          const newDoc = next.legalDocuments.find(doc => doc.documentKey === key);
          if (!oldDoc || !newDoc || previous.legalSnapshotToken !== next.legalSnapshotToken || oldDoc.versionId !== newDoc.versionId || oldDoc.contentHash !== newDoc.contentHash || oldDoc.requiredAction !== newDoc.requiredAction) this.$set(this.accepted, key, false);
        }
        if (previous && previous.legalSnapshotToken !== next.legalSnapshotToken) { this.legalOpen = false; this.selectedDocument = null; }
        this.context = next;
      } catch (error) {
        this.context = null;
        this.contextError = ['LEGAL_UNAVAILABLE', 'NETWORK_ERROR'].includes(error.code)
          ? 'No pudimos cargar los documentos legales. Tus datos siguen en el formulario.'
          : registrationErrorMessage(error);
      }
      finally { this.loading = false; }
    },
    documentConfirmation(doc) {
      if (doc.requiredAction === 'acknowledge') return `Confirmo que se me presentó ${doc.title}.`;
      if (doc.requiredAction === 'consent') return `Otorgo el consentimiento descrito en ${doc.title}.`;
      return `Acepto ${doc.title}.`;
    },
    clearLegalError() { if (this.documents.every(doc => this.accepted[doc.documentKey])) this.legalError = ''; },
    onFieldInput(key) {
      if (this.errors[key]) this.validateField(key);
      if (key === 'name' && this.errors.lastName) this.validateField('lastName');
      if (key === 'password' && this.form.confirmPassword) this.validateField('confirmPassword');
    },
    validateField(key) { this.$set(this.errors, key, registrationErrors(this.form)[key] || ''); },
    async showError(error) {
      if (this._isDestroyed) return;
      this.error = registrationErrorMessage(error);
      if (error.retryAfterSeconds) {
        clearInterval(this.timer);
        const until = Date.now() + error.retryAfterSeconds * 1000;
        const tick = () => { this.remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000)); if (!this.remaining) clearInterval(this.timer); };
        tick(); this.timer = setInterval(tick, 500);
      }
      await this.$nextTick(); if (this.$refs.alert) this.$refs.alert.focus();
    },
    async submit() {
      if (this.busy || this.loading || this.remaining || !this.available || this.created) return;
      this.errors = registrationErrors(this.form); this.error = '';
      this.legalError = this.documents.every(doc => this.accepted[doc.documentKey]) ? '' : 'Confirma todos los documentos para crear tu cuenta.';
      if (Object.keys(this.errors).length || this.legalError) {
        await this.$nextTick(); const invalid = this.$el.querySelector('input[aria-invalid=true]'); if (invalid) invalid.focus(); return;
      }
      this.busy = true;
      try {
        if (!this.attemptId) this.attemptId = registrationAttemptId();
        const result = await Registration.register({
          account: { first_name: this.form.name.trim(), last_name: this.form.lastName.trim(), telephone: this.form.telephone.trim(), email: this.form.email.trim(), password: this.form.password },
          business: { name: this.form.businessName.trim() },
          legalContext: this.context.legalContext,
          legalAcceptances: this.documents.map(doc => ({ documentKey: doc.documentKey, versionId: doc.versionId, acknowledged: this.accepted[doc.documentKey] }))
        }, this.attemptId);
        if (this._isDestroyed) return;
        if (!result.accountCreated) throw { code: 'NETWORK_ERROR' };
        this.created = true; this.form.password = ''; this.form.confirmPassword = ''; this.sessionEstablished = result.sessionEstablished;
        this.registrationActivation = result.activation;
        if (result.sessionEstablished) await this.resumeSession();
      } catch (error) {
        if (this._isDestroyed) return;
        if (error.code === 'LEGAL_VERSION_CHANGED') await this.loadContext();
        this.alreadyAuthenticated = error.code === 'ACCOUNT_ALREADY_AUTHENTICATED';
        await this.showError(error);
      } finally { this.busy = false; }
    },
    async resumeSession() {
      if (this.remaining) return;
      this.busy = true; this.error = '';
      try {
        if (this.needsInitialCode) {
          this.sendingCode = true;
          const key = verificationStorageKey(this.registrationActivation.accountId, this.form.email);
          saveVerification(key, { challengeId: null, expiresAt: 0, resendAt: Date.now() + 60000 });
          const challenge = await Registration.sendCode();
          if (this._isDestroyed) return;
          const data = {
            challengeId: challenge.challengeId,
            expiresAt: Date.parse(challenge.expiresAt),
            resendAt: Date.now() + challenge.resendAfterSeconds * 1000
          };
          saveVerification(key, data);
          this.initialVerification = { key, data, activation: this.registrationActivation };
          this.sendingCode = false;
        }
        await this.$store.dispatch('CORE/AUTH/getToken');
        if (!this.$store.getters['CORE/AUTH/isAuthorized']) throw { code: 'AUTH_REQUIRED' };
        await this.$router.replace({ name: 'accountActivation', params: { registrationVerification: this.initialVerification } });
      } catch (error) {
        let failure = error;
        if (this.sendingCode && error.code === 'NETWORK_ERROR') {
          failure = { code: 'REGISTRATION_CODE_SEND_UNCONFIRMED', retryAfterSeconds: 60 };
        } else if (this.sendingCode && error.code === 'CONTACT_PROVIDER_UNAVAILABLE') {
          failure = { ...error, retryAfterSeconds: error.retryAfterSeconds || 60 };
        }
        await this.showError(failure);
      } finally { this.busy = false; this.sendingCode = false; }
    },
    async openDocument(doc, event) {
      this.legalTrigger = event.currentTarget;
      this.selectedDocument = doc;
      this.legalOpen = true;
      await this.$nextTick();
      const title = this.$refs.legalTitle;
      // Vuetify 2 keeps the dialog role on a detached container.
      const dialog = title && title.closest('[role="dialog"]');
      if (this.legalOpen && dialog) {
        dialog.setAttribute('aria-labelledby', title.id);
        dialog.removeAttribute('aria-hidden');
        title.focus();
      }
    },
    restoreLegalFocus(open) {
      if (open) return;
      this.$nextTick(() => {
        if (this.legalOpen) return;
        if (this.legalTrigger && this.legalTrigger.isConnected) this.legalTrigger.focus();
        const title = this.$refs.legalTitle;
        const dialog = title && title.closest('[role="dialog"]');
        if (dialog) dialog.setAttribute('aria-hidden', 'true');
      });
    },
    openLegalLink(event) {
      const link = event.target.closest('a');
      if (!link) return;
      event.preventDefault();
      const href = link.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
};
</script>
<style scoped src="./accountFlow.css">@media(max-width:600px) { .registration-fields { grid-template-columns:minmax(0,1fr); } }
</style>

<style scoped>
.registration-page ::v-deep .auth-card { width:40rem; max-width:100%; }
.registration-fields > div { min-width:0; }
.registration-field-wide { grid-column:1 / -1; }
.registration-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.registration-fields ::v-deep .v-messages { font-weight:400; line-height:1.5; }
.registration-agreements { margin-top:20px; }
.registration-legal-choice + .registration-legal-choice { margin-top:10px; }
.registration-legal-choice ::v-deep .v-input--checkbox { margin-top:0; padding-top:0; }
.registration-legal-choice ::v-deep .v-label { font-size:.875rem; line-height:1.5; color:var(--color-grey); }
.registration-legal-link { margin-left:32px; color:var(--auth-link); font-size:.875rem; font-weight:600; text-align:left; }
.registration-legal-link:hover { text-decoration:underline; }
.registration-submit { margin-top:24px; }
.registration-legal-fields { border:0; margin:0; min-width:0; padding:0; }
.registration-legal-alert { margin:0 0 12px; }
.registration-loading { display:flex; align-items:center; gap:8px; min-height:24px; color:var(--color-grey); font-size:.8125rem; line-height:1.4; }
.registration-loading .v-progress-circular { flex-shrink:0; }
.registration-document.v-card { border-radius:14px; max-height:min(44rem, 86vh); max-height:min(44rem, 86dvh); padding:0; background:var(--color-surface); }
.registration-document-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:20px 24px 16px; border-bottom:1px solid var(--auth-border); }
.registration-document-header h2 { margin:0; font-size:clamp(1.15rem, 3vw, 1.4rem); font-weight:700; line-height:1.3; overflow-wrap:anywhere; }
.registration-document-header .flow-hint { margin:4px 0 0; }
.registration-document-close.v-btn { flex-shrink:0; width:44px; height:44px; border:1px solid var(--auth-border); color:var(--color-primary-900); }
.registration-document .flow-legal__body { min-height:0; max-height:none; margin:0; padding:20px 24px 24px; border:0; color:var(--color-primary-900); font-size:.95rem; line-height:1.65; overscroll-behavior:contain; }
.registration-document .flow-legal__body ::v-deep a { color:var(--auth-link); text-decoration:underline; }
.registration-document .flow-legal__body ::v-deep h1 { font-size:1.3rem; line-height:1.35; }
.registration-document .flow-legal__body ::v-deep h2 { font-size:1.15rem; line-height:1.4; }
.registration-document .flow-legal__body ::v-deep table { max-width:100%; }
@media(max-width:600px) {
  .registration-document-header { padding:14px 16px 12px; }
  .registration-document .flow-legal__body { padding:16px; }
}
@media(prefers-reduced-motion:reduce) {
  .registration-loading .v-progress-circular { display:none; }
}
@media(max-width:600px) { .registration-fields { grid-template-columns:minmax(0,1fr); } }
</style>
