<template>
  <account-flow-shell :step="verified ? 3 : 2">
    <p class="flow-eyebrow">{{ verified ? 'PASO 3 · ACTIVA PROFESIONAL' : 'PASO 2 · VERIFICA TU CORREO' }}</p>
    <h1 id="account-title" ref="title" tabindex="-1" class="flow-title">{{ verified ? 'Tu correo está verificado' : 'Confirma tu correo' }}</h1>
    <p v-if="loading" class="flow-copy" role="status">Consultando tu cuenta…</p>
    <template v-else-if="activation">
      <div v-if="verified">
        <div class="flow-success"><strong>Tu cuenta está creada y tu correo está confirmado.</strong><p>Seguirás iniciando sesión con tu teléfono y contraseña.</p></div>
        <template v-if="activation.commercialState === 'activated'">
          <h2 class="flow-title">Tu licencia Profesional está activa</h2>
          <p v-if="activation.nextAction === 'retry_preparation'" class="flow-alert" role="alert">No pudimos revisar la preparación de tu consultorio. Tu licencia está activa; actualiza el estado para reintentar.</p>
          <p v-else class="flow-copy">Estamos preparando tu siguiente paso. Tus ajustes y el avance de tus guías se conservan.</p>
        </template>
        <template v-else>
          <section class="license-card" aria-label="Licencia Profesional">
            <span class="license-status">Activación pendiente</span>
            <h2>Profesional</h2>
            <p v-if="activation.nextAction === 'wait_confirmation'">Estamos esperando la confirmación de tu licencia. Actualiza el estado para volver a consultar.</p>
            <p v-else>La contratación todavía no está disponible. Crear tu cuenta no realiza ningún cobro.</p>
            <p v-if="plansError" role="alert">No pudimos consultar la disponibilidad. Actualiza el estado para reintentar.</p>
            <p v-else-if="plans && !plans.available" class="flow-hint">Los precios y las condiciones estarán disponibles cuando se habilite la contratación.</p>
          </section>
          <p class="flow-copy">Puedes cerrar sesión y volver más tarde con tu teléfono y contraseña; conservaremos tu cuenta y la verificación de tu correo.</p>
          <p class="flow-copy">Después de activar tu licencia, revisaremos lo que falta configurar y podrás comenzar o retomar tus guías.</p>
        </template>
      </div>
      <template v-else>
        <p class="flow-copy">Tu cuenta ya está creada. Enviaremos un código de 6 dígitos a <strong>{{ email || 'tu correo registrado' }}</strong>. Tu teléfono seguirá siendo el dato para iniciar sesión.</p>
        <button v-if="!editing" class="flow-link" :disabled="busy" @click="beginEdit">Corregir mi correo</button>
        <form v-if="editing" novalidate @submit.prevent="saveEmail">
          <div class="flow-field"><label for="activation-email">Correo electrónico</label><input id="activation-email" ref="emailInput" v-model="newEmail" class="flow-input" type="email" autocomplete="email" :disabled="busy" /></div>
          <div class="flow-actions"><button type="submit" class="flow-primary" :disabled="busy || rateLimited">Guardar correo</button><button class="flow-link" type="button" :disabled="busy" @click="editing = false">Cancelar</button></div>
        </form>
        <template v-else>
          <p v-if="!challenge" class="flow-hint">Solicita tu código para continuar. También puedes revisar la carpeta de correo no deseado.</p>
          <form v-if="challenge" novalidate @submit.prevent="confirm">
            <div class="flow-field" style="margin-top:20px"><label for="email-code">Código de verificación</label>
              <input id="email-code" ref="codeInput" v-model="code" class="flow-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" :disabled="busy" aria-describedby="code-help" />
              <p id="code-help" class="flow-hint">Usa el último código recibido. Tiene una vigencia de 10 minutos.</p>
            </div>
            <button class="flow-primary flow-wide" type="submit" :disabled="busy || rateLimited">{{ busy ? 'Verificando…' : 'Verificar correo' }}</button>
          </form>
          <div class="flow-actions"><button :class="challenge ? 'flow-secondary' : 'flow-primary'" :disabled="busy || remaining > 0" @click="sendCode">{{ remaining > 0 ? 'Reenviar en ' + remaining + ' s' : challenge ? 'Enviar otro código' : 'Enviar código por correo' }}</button></div>
        </template>
      </template>
    </template>
    <div v-if="error" ref="alert" role="alert" tabindex="-1" class="flow-alert">{{ error }}<span v-if="rateLimited"> Puedes reintentar en {{ remaining }} s.</span></div>
    <p v-if="notice" role="status" class="flow-success">{{ notice }}</p>
    <div class="flow-actions"><button v-if="!loading" class="flow-secondary" :disabled="busy" @click="load">Actualizar estado</button><button class="flow-link" :disabled="busy" @click="logout">Cerrar sesión</button></div>
  </account-flow-shell>
</template>
<script>
import AccountFlowShell from './AccountFlowShell.vue';
import Registration from '../../services/core/auth/DARegistrationService';
import { registrationErrorMessage, validRegistrationEmail } from '../../utils/registration';
import { activationDestination } from '../../utils/activationDestination';
export default {
  components: { AccountFlowShell },
  data: () => ({ activation: null, plans: null, plansError: false, loading: true, busy: false, error: '', notice: '', challenge: null,
    code: '', remaining: 0, timer: null, rateLimited: false, editing: false, newEmail: '', correctedEmail: '' }),
  computed: {
    verified() { return Boolean(this.activation && this.activation.contact.emailVerified); },
    email() { return this.correctedEmail || (this.$store.getters['CORE/AUTH/getUser'] || {}).email || ''; }
  },
  created() { this.load(); },
  mounted() { this.$refs.title.focus(); },
  beforeDestroy() { clearInterval(this.timer); this.code = ''; this.challenge = null; },
  methods: {
    async showError(error) {
      if (this._isDestroyed) return;
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
    async load() {
      if (this.busy) return;
      this.loading = true; this.busy = true; this.error = ''; this.notice = '';
      try {
        const result = await Registration.activation();
        if (!this._isDestroyed) {
          this.activation = result;
          if (this.verified) { this.code = ''; this.challenge = null; this.editing = false; }
        }
        const session = await this.$store.dispatch('CORE/AUTH/getToken');
        if (session && session.success) this.correctedEmail = '';
        if (this._isDestroyed) return;
        if (!session || !session.success) throw { code: 'NETWORK_ERROR' };
        const destination = activationDestination(result);
        if (destination) {
          try { await this.$router.replace(destination); }
          catch (_) { await this.showError('No pudimos abrir el siguiente paso. Actualiza el estado para continuar.'); }
        } else if (this.verified && result.commercialState !== 'activated') {
          await this.loadPlans();
        }
      } catch (error) { await this.showError(error); }
      finally { this.loading = false; this.busy = false; }
    },
    async loadPlans() {
      this.plans = null; this.plansError = false;
      try { this.plans = await Registration.plans(); }
      catch (_) { if (!this._isDestroyed) this.plansError = true; }
    },
    async sendCode() {
      if (this.busy || this.remaining) return;
      this.busy = true; this.error = ''; this.notice = '';
      try {
        const challenge = await Registration.sendCode();
        if (this._isDestroyed) return;
        this.challenge = challenge.challengeId; this.code = ''; this.cooldown(challenge.resendAfterSeconds);
        this.notice = 'Enviamos el código a tu correo. Revisa también el correo no deseado.';
        this.busy = false;
        await this.$nextTick(); this.$refs.codeInput.focus();
      } catch (error) { await this.showError(error); }
      finally { this.busy = false; }
    },
    async confirm() {
      if (this.busy || this.rateLimited || !this.challenge) return;
      if (!/^[0-9]{6}$/.test(this.code.trim())) { await this.showError('Escribe los 6 dígitos del código.'); return; }
      this.busy = true; this.error = ''; this.notice = '';
      try {
        const result = await Registration.confirm(this.challenge, this.code.trim());
        if (this._isDestroyed) return;
        this.activation = result; this.code = ''; this.challenge = null;
        clearInterval(this.timer); this.remaining = 0;
        await this.loadPlans();
        await this.$nextTick(); this.$refs.title.focus();
      } catch (error) { await this.showError(error); }
      finally { this.busy = false; }
    },
    async beginEdit() { this.newEmail = this.email; this.editing = true; await this.$nextTick(); this.$refs.emailInput.focus(); },
    async saveEmail() {
      if (this.busy || this.rateLimited) return;
      const email = this.newEmail.trim().toLowerCase();
      if (!validRegistrationEmail(email)) { await this.showError('Escribe un correo electrónico válido.'); return; }
      this.busy = true; this.error = ''; this.notice = '';
      try {
        const result = await Registration.changeEmail(email);
        if (this._isDestroyed) return;
        this.activation = result; this.correctedEmail = email; this.challenge = null; this.code = ''; this.editing = false;
        this.notice = 'Correo actualizado. Solicita un nuevo código para verificarlo.';
        // Do not depend on a successful session refresh to show the saved email.
        const session = await this.$store.dispatch('CORE/AUTH/getToken');
        if (session && session.success) this.correctedEmail = '';
      } catch (error) { await this.showError(error); }
      finally { this.busy = false; }
    },
    async logout() { if (this.busy) return; this.busy = true; await this.$store.dispatch('CORE/AUTH/logout'); }
  }
};
</script>
<style scoped src="./accountFlow.css"></style>
<style scoped>
.license-card{margin:24px 0;padding:24px;border:1px solid #c3dbd7;border-radius:16px;background:#f4faf8}.license-card h2{font-size:28px;margin:14px 0}.license-card p{line-height:1.65}.license-status{display:inline-block;border-radius:20px;padding:6px 12px;font-size:13px;font-weight:700;background:#fff0cb;color:#765514}@media(max-width:360px){.license-card{padding:16px}}
</style>
