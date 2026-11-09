<template>
  <account-flow-shell :step="verified ? 3 : 2">
    <h1 id="account-title" ref="title" tabindex="-1" class="flow-title">{{ accountReady ? 'Tu cuenta está lista' : verified ? 'Tu correo está verificado' : 'Confirma tu correo' }}</h1>
    <p v-if="loading" class="flow-copy" role="status">Consultando tu cuenta…</p>
    <template v-else-if="activation">
      <activation-welcome v-if="accountReady" :trial="activation.subscriptionStatus === 'trial'" :busy="busy" @continue="continueFromWelcome" />
      <p v-else-if="verified" class="flow-copy">Tu correo está confirmado. Consulta el estado de tu cuenta para continuar.</p>
      <template v-else>
        <p class="flow-copy activation-email">{{ challenge ? 'Enviamos un código a' : 'Verifica' }} <strong>{{ email || 'tu correo registrado' }}</strong>.</p>
        <form v-if="challenge" novalidate @submit.prevent="confirm">
          <div class="flow-field activation-code-field"><label for="email-code">Código de verificación</label>
            <div class="activation-otp" :class="{ 'activation-otp--disabled': busy }">
              <div ref="codeSlots" class="activation-otp__slots" aria-hidden="true">
                <span v-for="index in 6" :key="index" class="activation-otp__slot"
                  :class="{ 'activation-otp__slot--active': isCodeSlotActive(index - 1) }">
                  {{ code[index - 1] }}
                </span>
              </div>
              <input id="email-code" ref="codeInput" :value="code" class="activation-otp__input" type="text"
                inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"
                autocapitalize="off" spellcheck="false" :disabled="busy"
                @input="updateCode($event.target)" @paste.prevent="pasteCode" @click="placeCodeCaret"
                @focus="syncCodeSelection" @select="syncCodeSelection" @keyup="syncCodeSelection" />
            </div>
          </div>
          <button class="flow-primary flow-wide" type="submit" :disabled="busy || rateLimited || code.length !== 6">{{ busy && !sendingCode ? 'Verificando…' : 'Verificar correo' }}</button>
        </form>
        <div class="activation-resend">
          <button :class="challenge || remaining ? 'flow-secondary' : 'flow-primary'" type="button" :disabled="busy || remaining > 0" @click="sendCode">
            {{ sendingCode ? 'Enviando código…' : remaining > 0 ? 'Reenviar en ' + remaining + ' s' : challenge ? 'Reenviar código' : 'Enviar código por correo' }}
          </button>
        </div>
      </template>
    </template>
    <div v-if="error" ref="alert" role="alert" tabindex="-1" class="flow-alert">{{ error }}<span v-if="rateLimited"> Puedes reintentar en {{ remaining }} s.</span></div>
    <button v-if="!loading && ((verified && !accountReady) || (error && needsRefresh))"
      class="flow-secondary" type="button" :disabled="busy" @click="load()">Actualizar estado</button>
    <p class="flow-footer"><button class="flow-link activation-switch" type="button" :disabled="busy" @click="logout">{{ verified ? 'Cerrar sesión' : 'Usar otra cuenta' }}</button></p>
  </account-flow-shell>
</template>
<script>
import AccountFlowShell from './AccountFlowShell.vue';
import ActivationWelcome from '../configuration/components/ActivationWelcome.vue';
import Registration from '../../services/core/auth/DARegistrationService';
import { registrationErrorMessage, verificationStorageKey, saveVerification, loadVerification } from '../../utils/registration';
import { activationDestination } from '../../utils/activationDestination';
export default {
  components: { AccountFlowShell, ActivationWelcome },
  data: () => ({ activation: null, loading: true, busy: false, error: '', challenge: null,
    code: '', codeSelectionStart: 0, codeSelectionEnd: 0, codeExpiresAt: 0, sendingCode: false, remaining: 0, timer: null, rateLimited: false, needsRefresh: false }),
  computed: {
    verified() { return Boolean(this.activation && this.activation.contact.emailVerified); },
    accountReady() {
      return this.verified && this.activation.commercialState === 'activated' && this.activation.welcomePending === true;
    },
    email() { return (this.$store.getters['CORE/AUTH/getUser'] || {}).email || ''; },
    verificationStorageKey() {
      return verificationStorageKey(this.activation && this.activation.accountId, this.email);
    }
  },
  created() { this.initialize(); },
  mounted() { this.$refs.title.focus(); },
  beforeDestroy() { clearInterval(this.timer); this.code = ''; this.challenge = null; },
  methods: {
    isCodeSlotActive(index) {
      const start = Math.min(this.codeSelectionStart, 5);
      const end = Math.max(this.codeSelectionEnd, start + 1);
      return index >= start && index < end;
    },
    syncCodeSelection() {
      const input = this.$refs.codeInput;
      this.codeSelectionStart = input.selectionStart;
      this.codeSelectionEnd = input.selectionEnd;
    },
    updateCode(input) {
      const value = input.value.replace(/[^0-9]/g, '').slice(0, 6);
      if (value !== input.value) {
        const caret = input.value.slice(0, input.selectionStart).replace(/[^0-9]/g, '').length;
        input.value = value;
        input.setSelectionRange(caret, caret);
      }
      this.code = value;
      this.syncCodeSelection();
    },
    pasteCode(event) {
      const input = event.target;
      const digits = event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
      if (!digits) return;
      if (digits.length === 6) {
        input.setRangeText(digits, 0, input.value.length, 'end');
      } else {
        const available = 6 - input.value.length + input.selectionEnd - input.selectionStart;
        if (!available) return;
        input.setRangeText(digits.slice(0, available), input.selectionStart, input.selectionEnd, 'end');
      }
      this.updateCode(input);
    },
    placeCodeCaret(event) {
      const input = event.target;
      if (event.detail === 1 && input.selectionStart === input.selectionEnd) {
        const index = Array.from(this.$refs.codeSlots.children).findIndex(slot => event.clientX <= slot.getBoundingClientRect().right);
        const caret = index === -1 ? this.code.length : Math.min(index, this.code.length);
        input.setSelectionRange(caret, caret);
      }
      this.syncCodeSelection();
    },
    async initialize() {
      const handoff = this.$route.params.registrationVerification;
      const user = this.$store.getters['CORE/AUTH/getUser'] || {};
      const business = this.$store.getters['CORE/AUTH/getBusiness'] || {};
      if (handoff && business.subscriptionStatus === 'pending_activation'
        && handoff.activation.accountId === user.id_login && handoff.activation.businessId === business.id_business
        && handoff.key === verificationStorageKey(user.id_login, this.email)) {
        this.activation = handoff.activation;
        this.restoreVerification(handoff.data);
        if (this.challenge) {
          this.loading = false;
          return;
        }
      }
      await this.load();
      if (this._isDestroyed || !this.activation || this.verified || this.error) return;
      if (!this.restoreVerification()) await this.sendCode();
    },
    rememberVerification(seconds = 60) {
      saveVerification(this.verificationStorageKey, {
        challengeId: this.challenge, expiresAt: this.codeExpiresAt, resendAt: Date.now() + seconds * 1000
      });
    },
    restoreVerification(saved = loadVerification(this.verificationStorageKey)) {
      if (!saved || !Number.isFinite(saved.resendAt) || !Number.isFinite(saved.expiresAt)) return false;
      if (typeof saved.challengeId === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(saved.challengeId) && saved.expiresAt > Date.now()) {
        this.challenge = saved.challengeId; this.codeExpiresAt = saved.expiresAt;
      }
      const remaining = Math.max(0, Math.ceil((saved.resendAt - Date.now()) / 1000));
      if (remaining) this.cooldown(remaining);
      return Boolean(this.challenge || remaining);
    },
    clearVerification() {
      try { sessionStorage.removeItem(this.verificationStorageKey); } catch (_) { /* Storage is optional. */ }
    },
    async showError(error, needsRefresh = false) {
      if (this._isDestroyed) return;
      this.needsRefresh = needsRefresh || error.code === 'NETWORK_ERROR';
      this.error = typeof error === 'string' ? error : registrationErrorMessage(error);
      if (error.code === 'NETWORK_ERROR') this.error = 'No pudimos confirmar esta acción. Actualiza el estado de tu cuenta antes de volver a intentarlo.';
      if (error.retryAfterSeconds) { this.rateLimited = true; this.cooldown(error.retryAfterSeconds); }
      await this.$nextTick(); if (this.$refs.alert) this.$refs.alert.focus();
    },
    cooldown(seconds) {
      clearInterval(this.timer); const until = Date.now() + seconds * 1000;
      const tick = () => { this.remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000)); if (!this.remaining) { clearInterval(this.timer); this.rateLimited = false; } };
      tick(); this.timer = setInterval(tick, 500);
    },
    async load(confirmed = null) {
      if (this.busy) return;
      this.loading = !confirmed; this.busy = true; this.error = '';
      try {
        const result = confirmed || await Registration.activation();
        if (this._isDestroyed) return;
        const session = await this.$store.dispatch('CORE/AUTH/getToken');
        if (this._isDestroyed) return;
        this.activation = result;
        if (this.verified) {
          this.clearVerification();
          this.code = ''; this.challenge = null; this.codeExpiresAt = 0;
          clearInterval(this.timer); this.remaining = 0;
        }
        if (!session || !session.success) throw { code: 'NETWORK_ERROR' };
        if (this.accountReady) {
          this.loading = false;
          await this.$nextTick();
          if (this.$refs.title) this.$refs.title.focus();
          return;
        }
        const destination = activationDestination(result);
        if (destination) {
          try { await this.$router.replace(destination); }
          catch (_) { await this.showError('No pudimos abrir el siguiente paso. Actualiza el estado para continuar.', true); }
        }
      } catch (error) { await this.showError(error, true); }
      finally { this.loading = false; this.busy = false; }
    },
    async continueFromWelcome(configure) {
      if (this.busy || !this.accountReady) return;
      this.busy = true;
      this.error = '';
      try {
        const result = await Registration.acknowledgeWelcome();
        if (!result || !result.acknowledged) throw Error();
        const session = await this.$store.dispatch('CORE/AUTH/getToken');
        if (this._isDestroyed) return;
        if (!session || !session.success) throw Error();
        await this.$router.replace(configure ? { name: 'admin', query: { section: 'summary' } } : { name: 'home' });
      } catch (_) {
        await this.showError('No pudimos abrir el siguiente paso. Vuelve a intentarlo.');
      } finally { this.busy = false; }
    },
    async sendCode() {
      if (this.busy || this.remaining) return;
      this.busy = true; this.sendingCode = true; this.error = '';
      this.rememberVerification();
      try {
        const challenge = await Registration.sendCode();
        if (this._isDestroyed) return;
        this.challenge = challenge.challengeId; this.codeExpiresAt = Date.parse(challenge.expiresAt); this.code = '';
        this.cooldown(challenge.resendAfterSeconds); this.rememberVerification(challenge.resendAfterSeconds);
        this.sendingCode = false;
        this.busy = false;
        await this.$nextTick(); this.$refs.codeInput.focus();
      } catch (error) {
        if (this._isDestroyed) return;
        this.cooldown(error.retryAfterSeconds || 60); this.rememberVerification(error.retryAfterSeconds || 60);
        await this.showError(error);
      }
      finally { this.busy = false; this.sendingCode = false; }
    },
    async confirm() {
      if (this.busy || this.rateLimited || !this.challenge) return;
      if (!/^[0-9]{6}$/.test(this.code.trim())) { await this.showError('Escribe los 6 dígitos del código.'); return; }
      this.busy = true; this.error = '';
      try {
        const result = await Registration.confirm(this.challenge, this.code.trim());
        if (this._isDestroyed) return;
        this.busy = false;
        await this.load(result);
      } catch (error) { await this.showError(error); }
      finally { this.busy = false; }
    },
    async logout() { if (this.busy) return; this.busy = true; await this.$store.dispatch('CORE/AUTH/logout'); }
  }
};
</script>
<style scoped src="./accountFlow.css"></style>
<style scoped>
.activation-email { margin-bottom:2px; }
.activation-code-field { margin-top:20px; text-align:center; }
.activation-otp { position:relative; width:min(100%, 22rem); margin-inline:auto; }
.activation-otp__slots { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:clamp(5px, 2vw, 10px); }
.activation-otp__slot {
  display:grid; place-items:center; height:52px; border:1px solid #a7bcc1; border-radius:10px;
  background:var(--color-surface); color:var(--color-primary-900); font-size:1.5rem; font-weight:600;
  font-variant-numeric:tabular-nums;
}
.activation-otp__input {
  position:absolute; inset:0; width:100%; height:100%; border:0; padding:0; background:transparent;
  color:transparent; caret-color:transparent; font-size:16px; cursor:text;
}
.activation-otp__input::selection { background:transparent; }
.activation-otp__input:focus-visible { outline:none; }
.activation-otp:focus-within .activation-otp__slot--active {
  outline:2px solid var(--auth-focus); outline-offset:1px;
}
.activation-otp--disabled { opacity:.6; }
.activation-resend { margin-top:12px; text-align:center; }
.activation-switch { min-height:44px; color:var(--color-grey); font-weight:500; }
</style>
