<template>
  <main class="access-unavailable">
    <h1>Esta cuenta no tiene acceso a este portal</h1>
    <p>La administración de plataforma se realiza desde su portal independiente.</p>
    <p>Para usar el consultorio, inicia sesión con una cuenta del consultorio.</p>
    <button type="button" :disabled="closing" @click="closeSession">{{ closing ? 'Cerrando sesión…' : 'Cerrar sesión' }}</button>
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>

<script>
export default {
  data: () => ({ closing: false, error: '' }),
  methods: {
    async closeSession() {
      this.closing = true;
      this.error = '';
      try { await this.$store.dispatch('CORE/AUTH/logout'); }
      catch (_) { this.error = 'No pudimos cerrar la sesión. Intenta nuevamente.'; }
      finally { this.closing = false; }
    }
  }
};
</script>

<style scoped>
.access-unavailable{max-width:640px;margin:64px auto;padding:24px;color:var(--color-primary-900,#134e4a);line-height:1.6}
h1{font-size:28px;line-height:1.25;margin-bottom:20px}
p{margin:16px 0}
button{min-height:44px;padding:10px 20px;border-radius:8px;background:var(--color-primary-800,#075a62);color:white;font-weight:600}
button:focus-visible{outline:3px solid #087f80;outline-offset:4px}
button:disabled{opacity:.6}
</style>
