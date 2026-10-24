<template>
  <account-flow-shell>
    <p class="flow-eyebrow">PASO 1 · TU CUENTA</p>
    <h1 id="account-title" ref="title" tabindex="-1" class="flow-title">Crea tu cuenta</h1>
    <p class="flow-copy">Registra tu negocio y a la persona que lo administrará. Después verificarás tu correo.</p>
    <p v-if="loading" role="status" class="flow-copy">Preparando el registro…</p>
    <div v-else-if="created" class="flow-success" role="status">
      <strong>Tu cuenta ya está creada.</strong>
      <p>Si no se abrió tu sesión, puedes entrar con el teléfono y la contraseña que acabas de registrar.</p>
      <button v-if="sessionEstablished" class="flow-primary" :disabled="busy" @click="resumeSession">Continuar con mi cuenta</button>
      <router-link v-else class="flow-primary" :to="{ name: 'login' }">Iniciar sesión</router-link>
    </div>
    <div v-else-if="!available">
      <div class="flow-alert" role="status">El registro no está disponible por el momento. Si ya tienes una cuenta, puedes iniciar sesión.</div>
      <button class="flow-secondary" @click="loadContext">Volver a consultar</button>
    </div>
    <form v-else novalidate :aria-busy="busy ? 'true' : 'false'" @submit.prevent="submit">
      <div class="flow-fields">
        <div v-for="field in fields" :key="field.key" class="flow-field" :class="{ 'flow-field--wide': field.key === 'password' }">
          <label :for="'register-' + field.key">{{ field.label }}</label>
          <div :class="{ 'flow-password': field.key === 'password' }">
            <input :id="'register-' + field.key" v-model="form[field.key]" class="flow-input" :name="field.key"
              :type="field.key === 'password' ? (showPassword ? 'text' : 'password') : field.type"
              :autocomplete="field.autocomplete" :inputmode="field.key === 'telephone' ? 'numeric' : undefined"
              :autocapitalize="['email', 'password'].includes(field.key) ? 'none' : undefined"
              :spellcheck="false" :disabled="busy" required
              :aria-invalid="errors[field.key] ? 'true' : 'false'"
              :aria-describedby="'register-' + field.key + '-help'" @blur="validateField(field.key)" @input="errors[field.key] && validateField(field.key)" />
            <button v-if="field.key === 'password'" type="button" class="flow-link" :disabled="busy" :aria-pressed="showPassword ? 'true' : 'false'"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">{{ showPassword ? 'Ocultar' : 'Mostrar' }}</button>
          </div>
          <div :id="'register-' + field.key + '-help'">
            <p v-if="field.hint" class="flow-hint">{{ field.hint }}</p>
            <p v-if="errors[field.key]" class="flow-error">{{ errors[field.key] }}</p>
          </div>
        </div>
      </div>
      <fieldset class="flow-checks" :disabled="busy">
        <legend class="flow-hint">Antes de crear tu cuenta</legend>
        <div v-for="doc in documents" :key="doc.documentKey" class="flow-check">
          <input :id="doc.documentKey" v-model="accepted[doc.documentKey]" type="checkbox" :aria-invalid="legalError ? 'true' : 'false'" aria-describedby="legal-help" />
          <div><label :for="doc.documentKey">{{ doc.documentKey === 'terms_conditions' ? 'Acepto los términos y condiciones de uso.' : 'He leído y acepto el aviso de privacidad.' }}</label>
            <br /><button class="flow-link" type="button" @click="openDocument(doc, $event)">Leer {{ doc.documentKey === 'terms_conditions' ? 'términos y condiciones' : 'aviso de privacidad' }}</button></div>
        </div>
        <p id="legal-help" :class="legalError ? 'flow-error' : 'flow-hint'">{{ legalError || 'El contrato de Profesional se revisará al contratar la licencia.' }}</p>
      </fieldset>
      <button class="flow-primary flow-wide" type="submit" :disabled="busy || remaining > 0">{{ busy ? 'Creando tu cuenta…' : remaining > 0 ? 'Reintentar en ' + remaining + ' s' : 'Crear cuenta' }}</button>
      <p class="flow-hint">Crear tu cuenta no activa una licencia ni realiza un cobro.</p>
    </form>
    <div v-if="error" ref="alert" class="flow-alert" role="alert" tabindex="-1">{{ error }}
      <button v-if="alreadyAuthenticated" class="flow-link" :disabled="busy" @click="resumeSession">Continuar con la sesión abierta</button>
    </div>
    <p class="flow-footer">¿Ya tienes cuenta? <router-link class="flow-link" :to="{ name: 'login' }">Iniciar sesión</router-link></p>
    <v-dialog v-model="legalOpen" max-width="720" scrollable aria-labelledby="registration-legal-title" @input="restoreLegalFocus">
      <div v-if="selectedDocument" class="flow-legal">
        <h2 id="registration-legal-title">{{ selectedDocument.title }}</h2>
        <p class="flow-hint">Versión {{ selectedDocument.versionId }}</p>
        <!-- Only the sanitized published document is rendered. -->
        <div class="flow-legal__body" tabindex="0" @click="openLegalLink" v-html="legalHtml"></div>
        <button class="flow-primary" type="button" @click="legalOpen = false; restoreLegalFocus(false)">Volver al registro</button>
      </div>
    </v-dialog>
  </account-flow-shell>
</template>
<script>
import DOMPurify from 'dompurify';
import AccountFlowShell from './AccountFlowShell.vue';
import Registration from '../../services/core/auth/DARegistrationService';
import { LEGAL_KEYS, usableRegistrationContext, registrationAttemptId, registrationErrors, registrationErrorMessage } from '../../utils/registration';

export default {
  components: { AccountFlowShell },
  data: () => ({
    form: { name: '', businessName: '', telephone: '', email: '', password: '' },
    fields: [
      { key: 'name', label: 'Tu nombre completo', type: 'text', autocomplete: 'name' },
      { key: 'businessName', label: 'Nombre del negocio o consultorio', type: 'text', autocomplete: 'organization' },
      { key: 'telephone', label: 'Teléfono', type: 'tel', autocomplete: 'tel-national', hint: '10 dígitos. Lo usarás para iniciar sesión; no enviaremos SMS.' },
      { key: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email', hint: 'Enviaremos aquí el código para verificar tu correo.' },
      { key: 'password', label: 'Contraseña', autocomplete: 'new-password', hint: 'Entre 15 y 128 caracteres. Puedes usar una frase con espacios.' }
    ],
    context: null, loading: true, busy: false, error: '', errors: {}, legalError: '',
    accepted: { terms_conditions: false, privacy_notice: false }, showPassword: false,
    legalOpen: false, selectedDocument: null, attemptId: null, created: false,
    sessionEstablished: false, alreadyAuthenticated: false, remaining: 0, timer: null
  }),
  computed: {
    available() { return usableRegistrationContext(this.context); },
    documents() { return this.available ? this.context.legalDocuments : []; },
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
  beforeDestroy() { clearInterval(this.timer); this.form.password = ''; this.attemptId = null; },
  methods: {
    async loadContext() {
      this.loading = true; this.error = '';
      const previous = this.context;
      try {
        const next = await Registration.context();
        if (this._isDestroyed) return;
        for (const key of LEGAL_KEYS) {
          const oldDoc = previous && previous.legalDocuments.find(doc => doc.documentKey === key);
          const newDoc = next.legalDocuments.find(doc => doc.documentKey === key);
          if (!oldDoc || !newDoc || oldDoc.versionId !== newDoc.versionId || oldDoc.contentHash !== newDoc.contentHash) this.accepted[key] = false;
        }
        this.context = next;
      } catch (error) { this.context = null; this.error = registrationErrorMessage(error); }
      finally { this.loading = false; }
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
      if (this.busy || this.remaining || !this.available || this.created) return;
      this.errors = registrationErrors(this.form); this.error = '';
      this.legalError = LEGAL_KEYS.every(key => this.accepted[key]) ? '' : 'Debes aceptar los términos y el aviso de privacidad para crear tu cuenta.';
      if (Object.keys(this.errors).length || this.legalError) {
        await this.$nextTick(); const invalid = this.$el.querySelector('[aria-invalid=true]'); if (invalid) invalid.focus(); return;
      }
      this.busy = true;
      try {
        if (!this.attemptId) this.attemptId = registrationAttemptId();
        const result = await Registration.register({
          account: { name: this.form.name.trim(), telephone: this.form.telephone.trim(), email: this.form.email.trim(), password: this.form.password },
          business: { name: this.form.businessName.trim() },
          legalAcceptances: this.documents.map(doc => ({ documentKey: doc.documentKey, versionId: doc.versionId, acknowledged: this.accepted[doc.documentKey] }))
        }, this.attemptId);
        if (this._isDestroyed) return;
        if (!result.accountCreated) throw { code: 'NETWORK_ERROR' };
        this.created = true; this.form.password = ''; this.sessionEstablished = result.sessionEstablished;
        if (result.sessionEstablished) await this.resumeSession();
      } catch (error) {
        if (this._isDestroyed) return;
        if (error.code === 'LEGAL_VERSION_CHANGED') await this.loadContext();
        this.alreadyAuthenticated = error.code === 'ACCOUNT_ALREADY_AUTHENTICATED';
        await this.showError(error);
      } finally { this.busy = false; }
    },
    async resumeSession() {
      this.busy = true; this.error = '';
      try {
        await this.$store.dispatch('CORE/AUTH/getToken');
        if (!this.$store.getters['CORE/AUTH/isAuthorized']) throw { code: 'AUTH_REQUIRED' };
        await this.$router.replace({ name: 'accountActivation' });
      } catch (error) { await this.showError(error); }
      finally { this.busy = false; }
    },
    openDocument(doc, event) { this.legalTrigger = event.currentTarget; this.selectedDocument = doc; this.legalOpen = true; },
    restoreLegalFocus(open) { if (!open) this.$nextTick(() => { if (this.legalTrigger && this.legalTrigger.isConnected) this.legalTrigger.focus(); }); },
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
<style scoped src="./accountFlow.css"></style>
