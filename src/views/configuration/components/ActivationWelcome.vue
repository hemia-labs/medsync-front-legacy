<template>
  <div class="activation-welcome">
    <p class="flow-copy">{{ trial ? 'Tu correo está verificado y tu prueba de 15 días ya comenzó.' : 'Tu correo está verificado y tu cuenta está activa.' }}</p>
    <p class="flow-copy">Te guiamos para preparar tu consultorio. Puedes hacerlo ahora o retomarlo después desde Configuración.</p>
    <button class="flow-primary flow-wide" type="button" :disabled="busy" @click="$emit('continue', true)">Configurar mi consultorio</button>
    <button class="flow-secondary flow-wide" type="button" :disabled="busy" @click="$emit('continue', false)">Ir al inicio</button>
  </div>
</template>

<script>
export default {
  props: { trial: Boolean, busy: Boolean }
};
</script>

<style scoped src="../../Auth/accountFlow.css"></style>
<style scoped>
.activation-welcome .flow-copy { margin-bottom:12px; }
.activation-welcome .flow-wide { margin-top:12px; }
</style>
