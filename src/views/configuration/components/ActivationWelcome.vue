<template>
  <aside v-if="pending" class="activation-welcome" aria-labelledby="activation-welcome-title">
    <h2 id="activation-welcome-title">Tu licencia está activa. Prepara tu consultorio.</h2>
    <p>Revisa las tareas de este resumen. Cada guía se abre cuando tú la eliges y puedes retomarla después; tus ajustes guardados se conservan.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <button type="button" :disabled="busy" @click="acknowledge">{{ busy ? 'Guardando…' : 'Entendido, revisar mis tareas' }}</button>
  </aside>
</template>
<script>
import Registration from '../../../services/core/auth/DARegistrationService';
export default {
  data: () => ({ busy: false, error: '', acknowledged: false }),
  computed: {
    pending() {
      const business = this.$store.getters['CORE/AUTH/getBusiness'] || {};
      return !this.acknowledged && business.registrationWelcomePending && business.registrationActivationConfirmed === true && business.subscriptionStatus === 'active';
    }
  },
  methods: {
    async acknowledge() {
      if (this.busy) return;
      this.busy = true; this.error = '';
      try {
        // This action occurs after arrival at Summary. It does not navigate or
        // begin/reset a guide, and a failed request keeps the welcome resumable.
        const result = await Registration.acknowledgeWelcome();
        if (!result || !result.acknowledged) throw new Error();
        this.acknowledged = true;
        await this.$store.dispatch('CORE/AUTH/getToken');
      } catch (_) { this.error = 'No pudimos guardar la bienvenida. Puedes reintentar; tus tareas no han cambiado.'; }
      finally { this.busy = false; }
    }
  }
};
</script>
<style scoped>
.activation-welcome{padding:24px;margin-bottom:24px;background:#edf8f4;border:1px solid #bddbd0;border-radius:16px;color:#173f37}.activation-welcome h2{font-size:24px;line-height:1.3;margin:0 0 12px}.activation-welcome p{line-height:1.6}.activation-welcome button{min-height:44px;padding:12px 18px;border-radius:10px;background:#176b61;color:white;font-weight:700}.activation-welcome button:focus-visible{outline:3px solid #1675ac;outline-offset:4px}.activation-welcome [role=alert]{color:#9e242b}@media(max-width:600px){.activation-welcome{padding:18px}.activation-welcome h2{font-size:21px}}
</style>
